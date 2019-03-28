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

        this._selectedItemIds = this.items.map(x => x.id);
        // this.rootItemIds = [];
        this.rootItemset = {"items": [], "support": 1};

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

        this.calculateItemAngles();
        this.calculateItemsetAngles();

        this.constructItems();
        this.constructItemsets();
        this.constructControls();
    }

    getItem(id){
    	return this.itemMap[id];
    }

    get rootItemIds(){
        return this.rootItemset.items;
    }

    get selectedItemIds(){
        return this._selectedItemIds.filter(x => !this.rootItemIds.includes(x));
    }

    set selectedItemIds(value){
        this._selectedItemIds = value;
    }

    findItemset(ids){
        for(let itemset of this.itemsets){
            if(arraysEqual(itemset.items, ids)){
                return itemset;
            }
        }
        return null;
    }

    resolveItemIds(ids){
        let items = [];
        for (let id of ids) {
            items.push(this.getItem(id))
        }
        return items;
    }

    reset(){
        this.rootItemset = {"items": [], "support": 1};
        this.selectedItemIds = this.items.map(x => x.id);
    	this.update();
    }

    constructItems(){
        this.itemArcGen = d3.arc()
            .innerRadius(this.innerRadius)
            .outerRadius(this.labelRadius);

        this.itemLabelArcGen = d3.arc()
            .innerRadius(this.labelRadius)
            .outerRadius(this.labelRadius);

        this.g.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", this.outerRadius)
            .style("fill", "#e8e8e8");

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
            })
            .on("click", function (selected){
                let items = [...this.rootItemIds, selected.id];
                let itemset = this.findItemset(items);
                if (itemset !== null){
                    this.itemClick(itemset);
                }
            }.bind(this));
        this.itemGroupArcs.arcGen = this.itemArcGen;
        this.arcs.push(this.itemGroupArcs);

        this.itemLabelArcs = itemGroups.append("path")
            .style("fill", "#fff")
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
            })
            .on("click", function (selected){
                let items = [...this.rootItemIds, selected.id];
                let itemset = this.findItemset(items);
                if (itemset !== null){
                    this.itemClick(itemset);
                }
            }.bind(this));
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
                if (d.items.length - this.rootItemset.items.length === 1) {
                    return "#fff";
                } else {
                    return colors(getItemsetId(d.items));
                }
            }.bind(this))
            .style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"})
            .classed("arc", true)
            .attr("d", this.itemsetArcGen)
            .each(function (d) {
                this._current = JSON.parse(JSON.stringify(d));
            })
            .on("click", function (selected){
                if(selected.items.length - this.rootItemset.items.length === 1){
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
                // if(d.items.length === 1 && this.rootItemIds.includes(d.items[0])){
                if(d.items === this.rootItemset.items){
                    return 1;
                }else{
                    return d.support.toFixed(2);
                }
            }.bind(this))
            .on("click", function (selected){
                if(selected.items.length - this.rootItemset.items.length === 1){
                    this.itemClick(selected);
                }else{
                    this.itemsetClick(selected);
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
	        }.bind(this))
            .on("click", function (selected){
            if(selected.items.length - this.rootItemset.items.length === 1){
                this.itemClick(selected);
            }else{
                this.itemsetClick(selected);
            }
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
        this.rootItemset = selected;
        this.update();
    }

    itemsetClick(selected) {
        this.selectedItemIds = selected.items;
        this.update()
    }

    update(){
    	// If all items are rendered, hide reset button
    	if(this.selectedItemIds.length === this.items.length && this.rootItemIds.length === 0){
    		this.resetButton.style("display", "none");
    	}else{
    		this.resetButton.style("display", "block");
    	}

        this.calculateItemAngles();
        this.calculateItemsetAngles();

        this.transition();
    }

    transition(){
        let _this = this;

        this.arcs.forEach(function(arc){
            let transition = arc
                .style("display", function(d){return this._current.startAngle === this._current.endAngle && d.startAngle === d.endAngle ? "none":"inline";})
                .transition()
                .duration(this.animationDuration);

            transition.attrTween("d", animate(arc.arcGen))
                .on("end", function(){
                    d3.select(this).style("display", function(d){return d.startAngle === d.endAngle ? "none":"inline"});
                });
            if (arc === this.itemsetGroupArcs){
                transition
                    .styleTween("fill", function(d){
                        let fromColor = this._color;
                        let toColor = colors(getItemsetId(d.items));;
                        if (d.items.length - _this.rootItemset.items.length <= 1) {
                            toColor = "#fff";
                        }

                        let i = d3.interpolate(fromColor, toColor);
                        return function(t) {
                            this._color = i(t);
                            return i(t);
                        }.bind(this);
                });
            }
        }, this);
        this.supportLabels
            .transition()
            .duration(this.animationDuration)
            .attrTween("text", function (d) {
                let support = d.support / _this.rootItemset.support;
                let i = d3.interpolate(d._support || d.support, support);

                return function(t) {
                    d3.select(this).text(i(t).toFixed(2));
                    d._support = i(t);
                }.bind(this);
            });
    }

    calculateItemAngles() {
        // calculate constants
        const amtItems = this.selectedItemIds.length;
        const baseAngle = 2 * Math.PI / amtItems;
        const offset = -baseAngle / 2;

        // set angles for visible items
        let index = 0;
        this.items.forEach(function (item) {
            if (this.selectedItemIds.includes(item.id)){
                // if rendered, set angle
                item.startAngle = offset + index * baseAngle;
                item.endAngle = offset + (index + 1) * baseAngle;
                item.midAngle = offset + (index + 0.5) * baseAngle;
                index++;
            }else{
                // if not rendered, set to 0
                item.startAngle = 0;
                item.midAngle = 0;
                item.endAngle = 0;
            }
        }, this);
    }

    calculateItemsetAngles() {
        // Sort to ensure itemsets with higher support are rendered earlier.
        // Note: could be done once in constructor.
        this.itemsets.sort(function (x, y) {
        	let order = d3.descending(x.support, y.support);
            return order !== 0 ? order: d3.ascending(x.items.length, y.items.length);
        });

        const radiusScale = d3.scaleLinear().range([this.labelRadius, this.outerRadius]);

        function hideSet(set){
            if(set.startAngle == null){
                set.startAngle = 0;
            }
            set.endAngle = set.startAngle;
        }

        const amtItems = this.selectedItemIds.length + this.rootItemset.items.length;
        const selectedItems = this.resolveItemIds(this.selectedItemIds);

        this.itemsets.forEach(function (set) {
            // check itemset length. Only display n, n-1 and 1. (1 more than root items)
            if (![amtItems, amtItems - 1, this.rootItemset.items.length + 1, this.rootItemset.items.length].includes(set.items.length)) {
                hideSet(set);
                return;
            }

            // item not selected => not rendered
            if (set.items.some(function (item) {
                return !(this.selectedItemIds.includes(item) || this.rootItemIds.includes(item));
            }.bind(this))){
                hideSet(set);
                return;
            }

            // does not contain all root items => not rendered
            if(this.rootItemIds.some(function(item){
                return !set.items.includes(item);
            })) {
                hideSet(set);
                return;
            }

            let setItems = [];
            set.items.forEach(function (d) {
                if (this.rootItemIds.includes(d)){
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
            } else if (set.items.length === amtItems) {
                set.startAngle = Math.PI;
                set.endAngle = 3 * Math.PI;
            } else {
                let startEndItem = findStartEndItems(setItems, selectedItems);
                let startItem = startEndItem[0];
                let endItem = startEndItem[1];
                set.startAngle = startItem.midAngle;
                set.endAngle = endItem.midAngle;
            }

            set.outerRadius = radiusScale(set.support / this.rootItemset.support);

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

    const itemIds = items.map(x => x.id);

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


function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;

    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    let as = [...a];
    let bs = [...b];
    as.sort();
    bs.sort();

    for (var i = 0; i < a.length; ++i) {
        if (as[i] !== bs[i]) return false;
    }
    return true;
}
