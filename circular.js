function circular(element, data) {
  console.log(data)

  const width = 500;
  const height = 500;

  const svg = element.append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height]);
      // .attr("width", 500)
      // .attr("height", 500);
  var g = svg.append("g");//.attr("transform", "translate(" + svg.attr("width") / 2 + "," + svg.attr("height") / 2 + ")");

  var arc = d3.arc()

  var amtLabels = data.labels.length;
  var baseAngle = 2 * Math.PI / amtLabels;
  var minRadius = 50;
  var maxRadius = 200;

  drawInner(g, data.labels, minRadius);

  // // var colors = ["orange", "blue", "green", "cyan"];
  // var colors = d3.scale.category10();
  //
  // for(var index = 0;index < data.values.length;index++){
  //   var item = data.values[index];
  //   var color = colors(index);
  //   var radius = minRadius + maxRadius * item[1]
  //
  //   var circle = arc({
  //       startAngle: index * baseAngle,
  //       endAngle: (index + 1) * baseAngle,
  //       outerRadius: radius,
  //       innerRadius: minRadius
  //     });
  //
  //     var circle = g.append("path")
  //         // .style("fill", color)
  //         .style("fill", color)
  //         .attr("d", circle)
  //         .style("stroke", "#000")
  //         .style("stroke-width", "1.5px");
  // }
}


function drawInner(g, labels, radius){
    var amtLabels = labels.length;
    var baseAngle = 2 * Math.PI / amtLabels;
    var offset = -baseAngle / 2;

    var arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius)
      .startAngle(function(d, i){return offset + i * baseAngle;})
      .endAngle(function(d, i){return offset + (i + 1) * baseAngle;});

    g.selectAll("path")
      .data(labels)
      .enter()
        .append("path")
        .style("fill", "white")
        .style("stroke", "#000")
        .style("stroke-width", "1.5px")
        .attr("d", arc);

    g.selectAll(".text")
			.data(labels)
		  .enter()
      .append("text")
          .attr("transform", function (d) {
          return "translate(" + arc.centroid(d) + ")";
      })
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .text(function (d) {
          return d;
      });

}
