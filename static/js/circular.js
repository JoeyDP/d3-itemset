let instance = 0;

function circular(element, data) {
    const size = 800;

    const width = size;
    const height = size;

    const scope = instance++;

    const svg = element.append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height]);
    const g = svg.append("g");

    calculateItemAngles(data.items);
    calculateItemsetAngles(data.items, data.itemsets);

    const innerRadius = 0;
    const labelRadius = 0.2 * size / 2;
    const outerRadius = size / 2 - 30;

    let updateFunc = addItems(g, data.items, innerRadius, labelRadius, scope);
    addItemsets(g, data.items, data.itemsets, labelRadius, outerRadius, scope, updateFunc);
}


function addItems(g, items, innerRadius, outerRadius, scope) {
    const arcGen = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    const labelArcGen = d3.arc()
        .innerRadius(outerRadius)
        .outerRadius(outerRadius);

    let itemGroups = g.selectAll(".item")
        .data(items)
        .enter()
        .append("g")
        .classed("item", true);

    let groupArcs = itemGroups.append("path")
        .style("fill", "white")
        .style("stroke", "#000")
        .style("stroke-width", "1.5px")
        .attr("d", arcGen)
        .each(function (d) {
            this._current = JSON.parse(JSON.stringify(d));
        });

    let labelArcs = itemGroups.append("path")
        .style("fill", "none")
        .attr("id", function (d) {
            return scope + "_" + d.id;
        })
        .attr("d", labelArcGen)
        .each(function (d) {
            this._current = JSON.parse(JSON.stringify(d));
        });

    let labels = itemGroups.append("text")
        .attr("dy", (outerRadius - innerRadius) / 2 + 4)
        .attr("text-anchor", "middle")
        .append("textPath")
        .attr("class", "textpath")
        .attr("xlink:href", function (d) {
            return "#" + scope + "_" + d.id;
        })
        .attr("startOffset", "25%")
        .text(function (d) {
            return d.label
        });

    function update(){
        console.log(items);
        let duration = 1000;

        groupArcs
            .style("display", function(d){return d.startAngle === d.endAngle ? null:"inline"})
            .transition()
            .duration(duration)
            .attrTween("d", animate(arcGen))
            .each("end", function(){
                d3.select(this).style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"});
            });

        labelArcs
            .style("display", function(d){return d.startAngle === d.endAngle ? null:"inline"})
            .transition()
            .duration(duration)
            .attrTween("d", animate(labelArcGen))
            .each("end", function(){
                d3.select(this).style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"});
                labels.style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"});
            });

        labels.style("display", function(d){return d.startAngle === d.endAngle ? null:"inline"});
    }

    return update;
}

function addItemsets(g, items, itemsets, innerRadius, outerRadius, scope, updateFunc) {
    const colors = d3.scale.category10();
    // const colors = d3.interpolateBlues;

    const radiusScale = d3.scale.linear()
        .range([innerRadius, outerRadius]);

    const arcGen = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(function (d) {
            return radiusScale(d.support);
        });

    const labelArcGen = d3.arc()
        .innerRadius(function (d) {
            return radiusScale(d.support);
        })
        .outerRadius(function (d) {
            return radiusScale(d.support);
        });

    let itemsetGroups = g.selectAll(".itemset")
        .data(itemsets)
        .enter()
        .append("g")
        .classed("itemset", true);

    let groupArcs = itemsetGroups.append("path")
        .style("fill", function (d, i) {
            if (d.items.length === 1) {
                return "#fff";
            } else {
                return colors(i);
            }
        })
        .style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"})
        .classed("arc", true)
        .attr("d", arcGen)
        .each(function (d) {
            this._current = JSON.parse(JSON.stringify(d));
        })
        .on("click", click);

    let labelArcs = itemsetGroups.append("path")
        .style("fill", "none")
        .style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"})
        .attr("id", function (d) {
            return scope + "_" + getItemsetId(d.items);
        })
        .attr("d", labelArcGen)
        .each(function (d) {
            this._current = JSON.parse(JSON.stringify(d));
        });

    let labels = itemsetGroups.append("text")
        .attr("dy", -10)
        .attr("text-anchor", "middle")
        .append("textPath")
        .style("display", function(d){return d.startAngle === null ? "none":"inline"})
        .classed("textpath", true)
        .attr("xlink:href", function (d) {
            return "#" + scope + "_" + getItemsetId(d.items)
        })
        .attr("startOffset", "25%")
        .text(function (d) {
            return d.support
        });


    function click(selected) {
        const duration = 1000;

        let newItems = [];

        const itemMap = {};
        items.forEach(function (item) {
            itemMap[item.id] = item;
        });

        selected.items.forEach(function (itemId) {
            newItems.push(itemMap[itemId]);
        });

        items.forEach(function (item) {
            item.startAngle = 0;
            item.midAngle = 0;
            item.endAngle = 0;
        });

        calculateItemAngles(newItems);
        calculateItemsetAngles(newItems, itemsets);

        groupArcs
            .style("display", function(d){return d.startAngle === d.endAngle ? null:"inline"})
            .transition()
            .duration(duration)
            .attrTween("d", animate(arcGen))
            .each("end", function(){
                d3.select(this).style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"});
            });

        labelArcs
            .style("display", function(d){return d.startAngle === d.endAngle ? null:"inline"})
            .transition()
            .duration(duration)
            .attrTween("d", animate(labelArcGen))
            .each("end", function(){
                d3.select(this).style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"});
                labels.style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"});
            });

        labels.style("display", function(d){return d.startAngle === d.endAngle ? null:"inline"});

        updateFunc();
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

function calculateItemAngles(items) {
    const amtItems = items.length;
    const baseAngle = 2 * Math.PI / amtItems;
    const offset = -baseAngle / 2;

    items.forEach(function (item, index) {
        item.startAngle = offset + index * baseAngle;
        item.endAngle = offset + (index + 1) * baseAngle;
        item.midAngle = offset + (index + 0.5) * baseAngle;
    });
}

function calculateItemsetAngles(items, itemsets) {
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
        });

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
    });
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
