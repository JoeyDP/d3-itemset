let instance = 0;

const RENDER_WIDTH = 800;
const RENDER_HEIGHT = 800;
const DIAMETER = 650

// const colors = d3.scale.category10();
var colors = d3.scaleOrdinal(d3.schemeCategory10)

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
        .attr("viewBox", [-RENDER_WIDTH / 2, -RENDER_HEIGHT / 2, RENDER_WIDTH, RENDER_HEIGHT]);

    const overlayDiv = div.append("div")
        .classed("overlay-child patternOptions showOnAncestorHover", true);
    
    const visualization = new Circular(svg, overlayDiv, data.items, data.itemsets);
}

class Circular {
    constructor(svg, overlay, items, itemsets) {
        this.svg = svg;
        this.overlay = overlay;
        this.g = svg.append("g");

        this.items = items;
        this.itemsets = itemsets;
        this.rootItems = [];
        
        this.itemMap = {};
        this.items.forEach(function (item) {
            this.itemMap[item.id] = item;
        }, this);

        this.scope = instance++;

        this.innerRadius = 0;
        this.labelRadius = 0.2 * DIAMETER / 2;
        this.outerRadius = DIAMETER / 2 - 30;

        this.animationDuration = 1000;

        this.arcs = [];

        this.calculateItemAngles(this.items);
        this.calculateItemsetAngles(this.items, this.itemsets);

        this.constructItems();
        this.constructItemsets();
        this.constructControls();
    }

    getItem(id){
    	return this.itemMap[id];
    }
    
    reset(){
        this.rootItems = [];
    	this.setFocussedItems(this.items);
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
        this.itemGroupArcs.arcGen = this.itemArcGen;
        this.arcs.push(this.itemGroupArcs);

        this.itemLabelArcs = itemGroups.append("path")
            .style("fill", "none")
            .attr("id", function (d) {
                return this.scope + "_" + d.id;
            }.bind(this))
            .attr("d", this.itemLabelArcGen)
            .each(function (d) {
                this._current = JSON.parse(JSON.stringify(d));
            });
        this.itemLabelArcs.arcGen = this.itemLabelArcGen;
        this.arcs.push(this.itemLabelArcs);

        this.itemLabels = itemGroups.append("text")
            .attr("dy", (this.labelRadius - this.innerRadius) / 2 + 4)
            .attr("text-anchor", "middle")
            .append("textPath")
            .attr("class", "textpath")
            .attr("xlink:href", function (d) {
                return "#" + this.scope + "_" + d.id;
            }.bind(this))
            .attr("startOffset", "25%")
            .append("tspan")
                        .each(function (d) {
                this._current = JSON.parse(JSON.stringify(d));
            });
        this.itemLabels.arcGen = this.itemLabelArcGen;
        this.arcs.push(this.itemLabels);
        
        // render icon or full label
        function hasIcon(d){return 'icon' in d && d.icon != "empty";}
        
        this.itemLabels.filter(hasIcon)
        	.attr('dominant-baseline', 'central')
            .classed("fa", true)
		    .text(function(d) {
		    	return faUnicode(d.icon);
		    });
	    this.itemLabels.filter(function (d){return !hasIcon(d);})
		    .text(function(d) {
		    	return d.label;
		    });
    }

    constructItemsets(){
        // const radiusScale = d3.scaleLinear()
        //     .range([this.labelRadius, this.outerRadius]);

        this.itemsetArcGen = d3.arc()
            .innerRadius(this.labelRadius);

        this.itemsetLabelArcGen = d3.arc()
            .innerRadius(function (d) {
                return d.outerRadius;
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
                    return colors(getItemsetId(d.items));
                }
            })
            .style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"})
            .classed("arc", true)
            .attr("d", this.itemsetArcGen)
            .each(function (d) {
                this._current = JSON.parse(JSON.stringify(d));
            })
            .on("click", function (selected){
                if(selected.items.length === 1){
                    this.itemClick(selected);
                }else{
                    this.itemsetClick(selected);
                }
            }.bind(this));
        this.itemsetGroupArcs.arcGen = this.itemsetArcGen;
        this.arcs.push(this.itemsetGroupArcs);

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
        this.itemsetLabelArcs.arcGen = this.itemsetLabelArcGen;
        this.arcs.push(this.itemsetLabelArcs);

        
        this.itemsetLabels = itemsetGroups.append("text")
	        .each(function (d) {
	            this._current = JSON.parse(JSON.stringify(d));
	        });
        
        // Values of all itemsets
        this.supportLabels = this.itemsetLabels.append("textPath")
        	.attr("text-anchor", "middle")
            .style("display", function(d){return d.startAngle === null ? "none":"inline"})
            .classed("textpath", true)
            .attr("xlink:href", function (d) {
                return "#" + this.scope + "_" + getItemsetId(d.items)
            }.bind(this))
            .attr("startOffset", "25%")
            .append("tspan")
            .attr("dy", "-0.2em")
            .text(function (d) {
                if(d.items.length === 1 && this.rootItems.includes(d.items[0])){
                    return 1;
                }else{
                    return d.support.toFixed(2);
                }
            }.bind(this));
        
        // Labels at the outer edge for single itemsets
        this.itemsetLabels.filter(function(d){ return d.items.length === 1; })
	        .append("textPath")
	    	.attr("text-anchor", "middle")
	        .style("display", function(d){return d.startAngle === null ? "none":"inline"})
	        .classed("textpath", true)
	        .attr("xlink:href", function (d) {
	            return "#" + this.scope + "_" + getItemsetId(d.items)
	        }.bind(this))
	        .attr("startOffset", "25%")
	        .append("tspan")
        	.attr("dy", "-1.2em")
	        .text(function (d) {
	            return this.getItem(d.items[0]).label;
	        }.bind(this));
        
        this.itemsetLabels.arcGen = this.itemsetLabelArcGen;
        this.arcs.push(this.itemsetLabels);
    }

    constructControls(){
        this.resetButton = this.overlay.append("button")
	        .classed("btn btn-fab btn-fab-mini btnInfo reset-button", true)
	        .style("display", "none")
	        .on("click", this.reset.bind(this));
        
        this.resetButton.append("i")
	        .classed("material-icons", true)
	        .text("settings_backup_restore");
    }

    itemClick(selected) {
        let newItems = [];
        let selectedItemId = selected.items[0];
        this.rootItems.push(selectedItemId);

        this.items.forEach(function (item) {
            if(item.id === selectedItemId){
                return;
            }
            newItems.push(item);
        }, this);
        this.items.forEach(function (item) {
            item.startAngle = 0;
            item.midAngle = 0;
            item.endAngle = 0;

        });

        this.setFocussedItems(newItems);
    }

    itemsetClick(selected) {
        let newItems = [];

        selected.items.forEach(function (itemId) {
            if(this.rootItems.includes(itemId)){
                return;
            }
            newItems.push(this.getItem(itemId));
        }, this);

        this.items.forEach(function (item) {
            item.startAngle = 0;
            item.midAngle = 0;
            item.endAngle = 0;
        });

        this.setFocussedItems(newItems)
    }

    setFocussedItems(items){
    	// If all items are rendered, hide reset button
    	if(items.length === this.items.length){
    		this.resetButton.style("display", "none");
    	}else{
    		this.resetButton.style("display", "block");
    	}

        this.calculateItemAngles(items);
        this.calculateItemsetAngles(items, this.itemsets);

        this.transition();
    }

    transition(){
        this.arcs.forEach(function(arc){
            arc
                .style("display", function(d){return this._current.startAngle === this._current.endAngle && d.startAngle === d.endAngle ? "none":"inline";})
                .transition()
                .duration(this.animationDuration)
                .attrTween("d", animate(arc.arcGen))
                .on("end", function(){
                    d3.select(this).style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"});
                });
        }, this);
        this.supportLabels.text(function (d) {
            if(d.items.length === 1 && this.rootItems.includes(d.items[0])){
                return 1;
            }else{
                return d.support.toFixed(2);
            }
        }.bind(this));
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
        itemsets.sort(function (x, y) {
        	let order = d3.descending(x.support, y.support);
            return order !== 0 ? order: d3.ascending(x.items.length, y.items.length);
        });

        const itemIds = items.map(item => item.id);

        const radiusScale = d3.scaleLinear().range([this.labelRadius, this.outerRadius]);

        function hideSet(set){
            if(set.startAngle == null){
                set.startAngle = 0;
            }
            set.endAngle = set.startAngle;
        }

        itemsets.forEach(function (set) {
            // check itemset length. Only display n, n-1 and 1.
            if (![items.length, items.length - 1, 1].includes(set.items.length)) {
                // set.startAngle = 0;
                if(set.startAngle == null){
                    set.startAngle = 0;
                }
                set.endAngle = set.startAngle;
                return;
            }

            // item not selected => not rendered
            if (set.items.some(function (item) {
                return !(itemIds.includes(item) || this.rootItems.includes(item));
            }.bind(this))){
                hideSet(set);
                return;
            }

            // does not contain all root items => not rendered
            if(this.rootItems.some(function(item){
                return !set.items.includes(item);
            })) {
                hideSet(set);
                return;
            }

            let setItems = [];
            set.items.forEach(function (d) {
                if (this.rootItems.includes(d)){
                    return;
                }
                setItems.push(this.getItem(d));
            }, this);

            if(setItems.length === 0){
                set.startAngle = Math.PI;
                set.endAngle = 3 * Math.PI;
            }else if (setItems.length === 1) {
                set.startAngle = d3.min(setItems, function (d) {
                    return d.startAngle;
                });
                set.endAngle = d3.max(setItems, function (d) {
                    return d.endAngle;
                });
            } else if (setItems.length === items.length) {
                set.startAngle = Math.PI;
                set.endAngle = 3 * Math.PI;
            } else {
                let startEndItem = findStartEndItems(setItems, items);
                let startItem = startEndItem[0];
                let endItem = startEndItem[1];
                set.startAngle = startItem.midAngle;
                set.endAngle = endItem.midAngle;
            }

            if (set.items.length === 1 && this.rootItems.includes(set.items[0])){
                set.outerRadius = radiusScale(1);
            }else{
                set.outerRadius = radiusScale(set.support);
            }

            // d3js does not respect start and end angle order. It just arcs
			// from the smallest to the largest.
            // We fix this by forcing the end angle to always be larger than the
			// start angle (adding 2PI).
            while (set.startAngle > set.endAngle) {
                set.endAngle += Math.PI * 2;
            }
        }, this);
    }
}


function animate(gen) {
    function trans(data){
        let interpolate = d3.interpolate(this._current, data);
        return function (t) {
            this._current = interpolate(t);
            return gen(this._current);
        }.bind(this);
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

// source: https://stackoverflow.com/a/35007151
function faUnicode(name) {
	var testI = document.createElement('i');
	var char;
	
	testI.className = 'fa fa-' + name;
	document.body.appendChild(testI);
	
	char = window.getComputedStyle( testI, ':before' )
	       .content.replace(/'|"/g, '');
	testI.remove();
	return char;// .charCodeAt(0);
}

