let instance = 0;


function circular(element, data, size=800) {
    const width = size;
    const height = size;

    const div = element.append("div")
        .classed("overlay-parent", true)
        .style("width", width + "px")
        .style("height", height + "px");

    const svg = div.append("svg")
        .classed("overlay-child", true)
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height]);
    const g = svg.append("g");

    const visualization = new Circular(g, data.items, data.itemsets, size);

    div.append("button")
        .classed("overlay-child", true)
        .classed("reset-button", true)
        .on("click", visualization.reset.bind(visualization))
        .append("i")
        .classed("fas fa-sync-alt", true);

}

class Circular {
    constructor(g, items, itemsets, size) {
        this.g = g;
        this.items = items;
        this.itemsets = itemsets;

        this.size = size;
        this.scope = instance++;

        this.innerRadius = 0;
        this.labelRadius = 0.2 * this.size / 2;
        this.outerRadius = this.size / 2 - 30;

        this.calculateItemAngles(this.items);
        this.calculateItemsetAngles(this.items, this.itemsets);

        this.constructItems();
        this.constructItemsets();
    }

    reset(){
        this.calculateItemAngles(this.items);
        this.calculateItemsetAngles(this.items, this.itemsets);
        this.transition();
    }

    constructItems(){
        this.itemArcGen = d3.arc()
            .innerRadius(this.innerRadius)
            .outerRadius(this.labelRadius);

        this.itemLabelArcGen = d3.arc()
            .innerRadius(this.labelRadius)
            .outerRadius(this.labelRadius);

        let itemGroups = this.g.selectAll(".item")
            .data(this.items)
            .enter()
            .append("g")
            .classed("item", true);

        this.itemGroupArcs = itemGroups.append("path")
            .style("fill", "white")
            .style("stroke", "#000")
            .style("stroke-width", "1.5px")
            .attr("d", this.itemArcGen)
            .each(function (d) {
                this._current = JSON.parse(JSON.stringify(d));
            });

        this.itemLabelArcs = itemGroups.append("path")
            .style("fill", "none")
            .attr("id", function (d) {
                return this.scope + "_" + d.id;
            }.bind(this))
            .attr("d", this.itemLabelArcGen)
            .each(function (d) {
                this._current = JSON.parse(JSON.stringify(d));
            });

        this.itemLabels = itemGroups.append("text")
            .attr("dy", (this.labelRadius - this.innerRadius) / 2 + 4)
            .attr("text-anchor", "middle")
            .append("textPath")
            .attr("class", "textpath")
            .attr("xlink:href", function (d) {
                return "#" + this.scope + "_" + d.id;
            }.bind(this))
            .attr("startOffset", "25%")
            .text(function (d) {
                return d.label
            });
    }

    constructItemsets(){
        const colors = d3.scale.category10();
        // const colors = d3.interpolateBlues;

        const radiusScale = d3.scale.linear()
            .range([this.labelRadius, this.outerRadius]);

        this.itemsetArcGen = d3.arc()
            .innerRadius(this.labelRadius)
            .outerRadius(function (d) {
                return radiusScale(d.support);
            });

        this.itemsetLabelArcGen = d3.arc()
            .innerRadius(function (d) {
                return radiusScale(d.support);
            })
            .outerRadius(function (d) {
                return radiusScale(d.support);
            });

        let itemsetGroups = this.g.selectAll(".itemset")
            .data(this.itemsets)
            .enter()
            .append("g")
            .classed("itemset", true);

        this.itemsetGroupArcs = itemsetGroups.append("path")
            .style("fill", function (d, i) {
                if (d.items.length === 1) {
                    return "#fff";
                } else {
                    return colors(i);
                }
            })
            .style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"})
            .classed("arc", true)
            .attr("d", this.itemsetArcGen)
            .each(function (d) {
                this._current = JSON.parse(JSON.stringify(d));
            })
            .on("click", this.itemsetClick.bind(this));

        this.itemsetLabelArcs = itemsetGroups.append("path")
            .style("fill", "none")
            .style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"})
            .attr("id", function (d) {
                return this.scope + "_" + getItemsetId(d.items);
            }.bind(this))
            .attr("d", this.itemsetLabelArcGen)
            .each(function (d) {
                this._current = JSON.parse(JSON.stringify(d));
            });

        this.itemsetLabels = itemsetGroups.append("text")
            .attr("dy", -10)
            .attr("text-anchor", "middle")
            .append("textPath")
            .style("display", function(d){return d.startAngle === null ? "none":"inline"})
            .classed("textpath", true)
            .attr("xlink:href", function (d) {
                return "#" + this.scope + "_" + getItemsetId(d.items)
            }.bind(this))
            .attr("startOffset", "25%")
            .text(function (d) {
                return d.support
            });
    }

    itemsetClick(selected) {
        let newItems = [];

        const itemMap = {};
        this.items.forEach(function (item) {
            itemMap[item.id] = item;
        });

        selected.items.forEach(function (itemId) {
            newItems.push(itemMap[itemId]);
        });

        this.items.forEach(function (item) {
            item.startAngle = 0;
            item.midAngle = 0;
            item.endAngle = 0;
        });

        this.calculateItemAngles(newItems);
        this.calculateItemsetAngles(newItems, this.itemsets);

        this.transition();
    }

    transition(){
        const duration = 1000;

        const self = this;
        this.itemsetGroupArcs
            .style("display", function(d){return d.startAngle === d.endAngle ? null:"inline"})
            .transition()
            .duration(duration)
            .attrTween("d", animate(this.itemsetArcGen))
            .each("end", function(){
                d3.select(this).style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"});
            });

        this.itemsetLabelArcs
            .style("display", function(d){return d.startAngle === d.endAngle ? null:"inline"})
            .transition()
            .duration(duration)
            .attrTween("d", animate(this.itemsetLabelArcGen))
            .each("end", function(){
                d3.select(this).style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"});
                self.itemsetLabels.style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"});
            });

        this.itemsetLabels.style("display", function(d){return d.startAngle === d.endAngle ? null:"inline"});

        this.itemGroupArcs
            .style("display", function(d){return d.startAngle === d.endAngle ? null:"inline"})
            .transition()
            .duration(duration)
            .attrTween("d", animate(this.itemArcGen))
            .each("end", function(){
                d3.select(this).style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"});
            });

        this.itemLabelArcs
            .style("display", function(d){return d.startAngle === d.endAngle ? null:"inline"})
            .transition()
            .duration(duration)
            .attrTween("d", animate(this.itemLabelArcGen))
            .each("end", function(){
                d3.select(this).style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"});
                self.itemLabels.style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"});
            });

        this.itemLabels.style("display", function(d){return d.startAngle === d.endAngle ? null:"inline"});
    }

    calculateItemAngles(items) {
        const amtItems = items.length;
        const baseAngle = 2 * Math.PI / amtItems;
        const offset = -baseAngle / 2;

        items.forEach(function (item, index) {
            item.startAngle = offset + index * baseAngle;
            item.endAngle = offset + (index + 1) * baseAngle;
            item.midAngle = offset + (index + 0.5) * baseAngle;
        }, this);
    }

    calculateItemsetAngles(items, itemsets) {
        const itemMap = {};
        items.forEach(function (item) {
            itemMap[item.id] = item;
        });

        itemsets.sort(function (x, y) {
            return d3.descending(x.support, y.support);
        });

        itemsets.forEach(function (set) {
            // check length
            // console.assert([items.length, items.length - 1, 1].includes(set.items.length), "Itemsets should only contain k, k-1 and 1 itemsets.");

            if (![items.length, items.length - 1, 1].includes(set.items.length)) {
                // set.startAngle = 0;
                if(set.startAngle == null){
                    set.startAngle = 0;
                }
                set.endAngle = set.startAngle;
                return;
            }
            if (set.items.some(function (item) {
                return !(item in itemMap);
            })) {
                if(set.startAngle == null){
                    set.startAngle = 0;
                }
                set.endAngle = set.startAngle;
                return;
            }

            let setItems = [];
            set.items.forEach(function (d) {
                setItems.push(itemMap[d]);
            }, this);

            if (set.items.length === 1) {
                set.startAngle = d3.min(setItems, function (d) {
                    return d.startAngle;
                });
                set.endAngle = d3.max(setItems, function (d) {
                    return d.endAngle;
                });
            } else if (set.items.length === items.length) {
                set.startAngle = Math.PI;
                set.endAngle = 3 * Math.PI;
            } else {
                let startEndItem = findStartEndItems(setItems, items);
                let startItem = startEndItem[0];
                let endItem = startEndItem[1];
                set.startAngle = startItem.midAngle;
                set.endAngle = endItem.midAngle;
            }

            // d3js does not respect start and end angle order. It just arcs from the smallest to the largest.
            // We fix this by forcing the end angle to always be larger than the start angle (adding 2PI).
            while (set.startAngle > set.endAngle) {
                set.endAngle += Math.PI * 2;
            }
        }, this);
    }
}


function animate(gen) {
    function trans(data){
        let interpolate = d3.interpolate(this._current, data);
        let _this = this;
        return function (t) {
            _this._current = interpolate(t);
            return gen(_this._current);
        };
    }
    return trans;
}

function getItemsetId(itemset) {
    return "itemset_" + itemset.join("_")
}

function findStartEndItems(items, allItems) {
    const allItemIds = [];
    for (let item of allItems) {
        allItemIds.push(item.id)
    }

    const itemIds = [];
    for (let item of items) {
        itemIds.push(item.id)
    }

    function getEndItem(startItem) {
        let startIndex = allItemIds.indexOf(startItem.id);
        for (let offset = 1; offset < items.length; offset++) {
            let nextIndex = (startIndex + offset) % allItemIds.length;
            let nextId = allItemIds[nextIndex];
            if (!itemIds.includes(nextId)) {
                return null;
            }
        }
        return allItems[(startIndex + items.length - 1) % allItems.length];
    }

    for (let startItem of items) {
        let endItem = getEndItem(startItem);
        if (endItem != null) {
            return [startItem, endItem];
        }
    }

    return null;
}


