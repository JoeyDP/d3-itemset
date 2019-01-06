
function circular(element, data) {
    const width = 800;
    const height = 800;

    const id = Math.random() % 100000;

    const svg = element.append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height]);
    const g = svg.append("g");


    const minRadius = 0;
    const labelRadius = 100;
    const maxRadius = 400;
    const radiusScale = d3.scale.linear()
        .range([labelRadius, maxRadius]);

    calculateItemAngles(data.items);
    calculateItemsetAngles(data.items, data.itemsets);


    const innerArc = d3.arc()
        .innerRadius(minRadius)
        .outerRadius(labelRadius);

    let nodes = g.selectAll(".item")
        .data(data.items)
        .enter()
        .append("path")
        .style("fill", "white")
        .style("stroke", "#000")
        .style("stroke-width", "1.5px")
        .attr('id', function(d){return id + "label" + d.id;})
        .attr("d", innerArc)
        .each(function(d,i) {
            //A regular expression that captures all in between the start of a string
            //(denoted by ^) and the first capital letter L
            var firstArcSection = /(^.+?)L/;

            //The [1] gives back the expression between the () (thus not the L as well)
            //which is exactly the arc statement
            var newArc = firstArcSection.exec( d3.select(this).attr("d") )[1];
            //Replace all the comma's so that IE can handle it -_-
            //The g after the / is a modifier that "find all matches rather than
            //stopping after the first match"
            newArc = newArc.replace(/,/g , " ");

            //Create a new invisible arc that the text can flow along
            svg.append("path")
                .attr("id", id + "label" + d.id + "_")
                .attr("d", newArc)
                .style("fill", "none");
        });

    g.selectAll(".label")
        .data(data.items)
        .enter()
        .append("text")
        .attr("dy", (labelRadius - minRadius) / 2 + 4)
        .attr("text-anchor", "middle")
        .append("textPath")
        .attr("class", "labelpath")
        .attr("xlink:href", function(d) {
            return "#" + id + "label" + d.id + "_";
        })
        .attr("startOffset", "50%")
        .text(function(d) {
            return d.label
        });


    const colors = d3.scale.category10();
    // const colors = d3.interpolateBlues;

    const arcs = d3.arc()
        .innerRadius(labelRadius)
        .outerRadius(function (d) {
            return radiusScale(d.support);
        });

    g.selectAll(".itemset")
        .data(data.itemsets)
        .enter()
        .append("path")
        .style("fill", function (d, i) {
            if (d.items.length === 1) {
                return "#fff";
            } else {
                return colors(i);
            }
        })
        .style("opacity", 0.8)
        .style("stroke", "#000")
        .style("stroke-width", "1.5px")
        .attr('id', function(d){return id + "arc" + getItemsetId(d.items);})
        .attr("d", arcs)
        .on("mouseover",function(){
            console.log("Hover", this);
            var sel = d3.select(this);
            sel.style("opacity", 1);
            sel.style("stroke-width", "2px");
        })
        .on("mouseout",function(){
            console.log("Hover", this);
            var sel = d3.select(this);
            sel.style("opacity", 0.8);
            sel.style("stroke-width", "1.5px");
        })
        .each(function(d,i) {
            //A regular expression that captures all in between the start of a string
            //(denoted by ^) and the first capital letter L
            var firstArcSection = /(^.+?)L/;

            //The [1] gives back the expression between the () (thus not the L as well)
            //which is exactly the arc statement
            var matches = firstArcSection.exec( d3.select(this).attr("d") );
            if (matches == null){
                console.log("Nope");
                return
            }

            var newArc = matches[1];
            //Replace all the comma's so that IE can handle it -_-
            //The g after the / is a modifier that "find all matches rather than
            //stopping after the first match"
            newArc = newArc.replace(/,/g , " ");

            //Create a new invisible arc that the text can flow along
            svg.append("path")
                .attr("id", id + "arc" + getItemsetId(d.items) + "_")
                .attr("d", newArc)
                .style("fill", "none");
        });

    g.selectAll(".label")
        .data(data.itemsets)
        .enter()
        .append("text")
        .attr("dy", -10)
        .attr("text-anchor", "middle")
        .append("textPath")
        .attr("class", "textpath")
        .attr("xlink:href", function(d) {
            return "#" + id + "arc" + getItemsetId(d.items) + "_";
        })
        .attr("startOffset", "50%")
        .text(function(d) {
            return d.support
        });

}

function getItemsetId(itemset){
    return itemset.join("_")
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
    itemsets.sort(function (x, y) {
        return d3.descending(x.support, y.support);
    });

    const itemMap = {};
    items.forEach(function (item) {
        itemMap[item.id] = item;
    });

    itemsets.forEach(function (set) {
        // check length
        console.assert([items.length, items.length - 1, 1].includes(set.items.length), "Itemsets should only contain k, k-1 and 1 itemsets.");

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
        }else if(set.items.length === items.length){
            set.startAngle = 0;
            set.endAngle = Math.PI * 2;
        } else {
            let startEndItem = findStartEndItems(setItems, items);
            let startItem = startEndItem[0];
            let endItem = startEndItem[1];
            set.startAngle = startItem.midAngle;
            set.endAngle = endItem.midAngle;
        }

        // d3js does not respect start and end angle order. It just arcs from the smallest to the largest.
        // We fix this by forcing the end angle to always be larger than the start angle (adding 2PI).
        while(set.startAngle > set.endAngle){
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

    function getEndItem(startItem){
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
        if(endItem != null){
            return [startItem, endItem];
        }
    }

    return null;
}
