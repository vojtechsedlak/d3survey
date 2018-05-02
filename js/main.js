
$(document).ready(function(){

	// Inital rendering of the data, based on preselected question
	var params = [];
	params.question = $('#question').find(":selected").val();
	params.compare = "None"
	params.filter = "None"
	loadData();


	// virtual pageviews
	$('.sidebar-menu a').on('click',function(e) {
		var page = $(this).attr("href").replace('#','');
		ga('send', 'pageview', "/"+page);
	})

	// Redraw data based on new selection
	$('select').on('change', function(e) {
		params.question = $('#question').find(":selected").val();
		params.compare = $('#compare').find(":selected").text();
		params.filter = $('#filter').find(":selected").val();
		params.filterName = $('#filter').find(":selected").text();
		if ($('#filter').find(":selected").val() == "None") {
			$('.filter-dropdown').hide();
			params.filterOption = undefined;
		} else {
			$('.filter-dropdown').hide();
			$('.active-filter').removeClass('active-filter');
			var filter = $('#filter').find(":selected").val();
			$("#"+filter).show().addClass('active-filter');
			params.filterOption = $('.active-filter').find(":selected").val();
		}
		loadData();

		// record analytics events
		var eventCategory = $(this).attr("id");
		var eventLabel = $(this).find(":selected").text();
		ga('send', 'event', eventCategory, "Filter Changed", eventLabel);
	});
	
	// Main data loading and parsing
	function loadData() {
		// Show dots while data is crunched
		$('#dots').show();
		$("svg").remove();
		var surveyData = [];
		d3.csv("assets/data/"+params.question+".csv", function(d,i,columns) {
			for (var i = 7, n = columns.length; i < n; ++i) d[columns[i]] = +d[columns[i]];
		  	return d;
		}).then(function(data) {

			// special scenario for q12
			if (params.question == "q12") {

				// check if any filtering is applied
				if (params.filter != "None" && params.filterOption != undefined) {
					if (params.filter == "Users") {
						params.filterName = "Facebook Users and Non-users";
					}
					filteredData = data.filter(function(d) { return d[params.filterName] == params.filterOption });
					filteredData.columns = data.columns;
					data = filteredData;
				}

				// check if any compare filter is selected
				if (params.compare == "None") {

					// aggregate data
					var nestedData = d3.nest()
						.key(function(d) {return d["Question"];})
						.key(function(d) {return d["Answer"];})
						.sortKeys(d3.ascending)
						.rollup(function(v) {return d3.sum(v,function(d) {return d.Total})})
						.entries(data)
					surveyData.columns = [];

					// construct the data array to pass along to the chart
					for(var i=0;i<nestedData.length;i++) {
						surveyData[i] = {};
						surveyData[i].Answer=nestedData[i].key;
						surveyData[i].Value=nestedData[i].values[1].value / (nestedData[i].values[1].value + nestedData[i].values[0].value)
						surveyData.columns.push(nestedData[i].key);
					}
					surveyData.type="single";

					// draw the plot and add the table output
					drawPlot(surveyData);
					appendTable(surveyData); 

				} else if (params.compare != "None") {

					// aggregate data including the compare filter selection
					var nestedData = d3.nest()
						.key(function(d) {return d["Question"];})
						.key(function(d) { return d["Answer"];})
						.key(function(d) { return d[params.compare];})
						.sortKeys(d3.ascending)
						.rollup(function(v) { return d3.sum(v,function(d) {return d.Total});})
						.entries(data);

					// construct the data array to pass along to the chart
					for(var i=0;i<nestedData.length;i++) {
						surveyData[i] = {};
						surveyData[i]["Answer"]=nestedData[i].key;
						for(var j=0;j<nestedData[0].values[1].values.length;j++) {
							surveyData[i][nestedData[i].values[1].values[j].key] = nestedData[i].values[1].values[j].value/(nestedData[i].values[1].values[j].value+nestedData[i].values[0].values[j].value);	
						}
					} 

					
					surveyData.columns = Object.keys(surveyData[0]);
					surveyData.columns.splice(0, 1);
					surveyData.type="grouped";
					
					// draw the plot and add the table output
					drawPlot(surveyData);
					appendTable(surveyData);

				}

			} else {

				if (params.compare == "None") {

					// check if any filtering is applied
					if (params.filter != "None" && params.filterOption != undefined) {
						if (params.filter == "Users") {
							params.filterName = "Facebook Users and Non-users";
						}
						filteredData = data.filter(function(d) { return d[params.filterName] == params.filterOption });
						filteredData.columns = data.columns;
						data = filteredData;
					}

					// prepopulate the final array
					var answerKeys = data.columns.slice(6);
						for(var i=0;i<answerKeys.length;i++) {
							surveyData[answerKeys[i]] = 0;
						};

					// aggregate data including the compare filter selection
					var nestedData = d3.nest()
						.key(function(d) { return d["Answer"];})
						.rollup(function(v) { return d3.sum(v,function(d) {return d.Total});})
						.entries(data);

					var total = 0;
					nestedData.forEach(function(d) {
						total += d.value;
					});

					// populate the final array
					surveyData.columns = [];
					for(var i=0;i<nestedData.length;i++) {
						surveyData[i] = {};
						surveyData[i].Answer = nestedData[i].key;
						surveyData[i].Value = nestedData[i].value/total;
						surveyData.columns.push(nestedData[i].key);
					};
					surveyData.type="single";

					// draw chart and append data table
					drawPlot(surveyData);
					appendTable(surveyData);

				} else if (params.compare != "None") {

					// check if any filtering is applied
					if (params.filter != "None" && params.filterOption != undefined) {
						if (params.filter == "Users") {
							params.filterName = "Facebook Users and Non-users";
						}
						filteredData = data.filter(function(d) {return d[params.filterName] == params.filterOption});
						filteredData.columns = data.columns;
						data = filteredData;

					}

					// identify answer keys for the question
					var answerKeys = data.columns.slice(6);

					// calculate totals to be used in the calculation for the final array
					var totalCounts = d3.nest()
						.key(function(d) { return d[params.compare];})
						.sortKeys(d3.ascending)
						.rollup(function(v) { return d3.sum(v, function(d) {return d.Total});})
						.entries(data);

					// check if enough data exists
					var valid = 1;
					totalCounts.forEach(function(count) {
						if (count.value < 50) {
							valid = 0;
							return;
						}

					});
					if (valid == 0) {
						sampleError();
						return;
					}

					// aggregate data
					var nestedData = d3.nest()
						.key(function(d) { return d["Answer"];})
						.key(function(d) { return d[params.compare];})
						.sortKeys(d3.ascending)
						.rollup(function(v) { return d3.sum(v,function(d) {return d.Total});})
						.entries(data);

					// populate the final array to pass along to the chart
					for(var i=0;i<nestedData.length;i++) {
						surveyData[i] = {};
						surveyData[i]["Answer"]=nestedData[i].key;
						for(var j=0;j<nestedData[0].values.length;j++) {
							surveyData[i][nestedData[i].values[j].key] = nestedData[i].values[j].value/totalCounts[j].value;	
						}
						
					} 
					//add columns
					surveyData.columns = Object.keys(surveyData[0]);
					surveyData.columns.splice(0, 1);
					surveyData.type="grouped";

					// draw chart and append data table
					drawPlot(surveyData);
					appendTable(surveyData);

				}	 						
			}

		});
	}



	function drawPlot(data) {
		$('#dots').hide();
		$('.sample-error').hide();

		// sort object labels for histogram
		if (params.question == "q2") {
			var orderedData = [];
			for(var i=0;i<data.length;i++) {
				var number = parseInt(data[i].Answer);
				orderedData[number] = data[i];
			}
			orderedData.columns = data.columns;
			orderedData.type = data.type;
			data = orderedData;
		}

		// set dimensions
		var margin = {top: 20, right: 30, bottom: 30, left: 50};
		var width = 0;
		var plotWidth = $("#plot-output").width() -margin.right - margin.left-60;
		var tableWidth = $("#table-output").width() -margin.right - margin.left-60;
		if (plotWidth < tableWidth) {
			width = tableWidth;
		} else {
			width = plotWidth;
		}
		var chartMargin = 0;
		if (data.type == "grouped") {
			chartMargin = 170;
		} else {
			chartMargin = 100;
		}
		var height = $("#plot-output").height() - margin.top - margin.bottom - chartMargin;
		$("svg").remove();

		// create initial elements (svg, g)
		var svg = d3.select("#plot-output")
			.append("svg")
			.attr("width",width+60)
			.attr("height",height+chartMargin)
			g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");


		// define scales
		var x0 = d3.scaleBand()
		    .rangeRound([0, width])
		    .paddingInner(0.1);

		x0.domain(data.map(function(d) { return d.Answer; }));

		var y = d3.scaleLinear()
		    .rangeRound([height, 0]);

		var z = d3.scaleOrdinal()
		    .range(["#F8766D", "#CD9600", "#7CAE00", "#6CCB9F", "#4DACAE", "#00BFC4", "#C77CFF", "#6392FF", "#FF61CC"]);


		var x1 = d3.scaleBand()
	    	.padding(0.05);	

	    // read in column keys for parsing in the chart
	    var keys = data.columns;

	    // number format to be used for rendering percentages in tooltip
	    var f = d3.format(",.2%");

	    // define the div for the tooltip
		var div = d3.select("body").append("div")	
    		.attr("class", "tooltip")				
    		.style("opacity", 0);

    	x1.domain(keys).rangeRound([0, x0.bandwidth()]);

    	// check what type of graph we are drawing
		if (data.type == "grouped") {

			// define y domain 
			y.domain([0, d3.max(data, function(d) { return d3.max(keys, function(key) { return d[key]; }); })]).nice();

			// add y axis
			g.append("g")
	      	.attr("class", "axis")
	      	.call(d3.axisLeft(y).ticks(5, "%").tickSize(-width))
		    .append("text")
		      .attr("x", 2)
		      .attr("y", y(y.ticks().pop()) + 0.5)
		      .attr("dy", "0.32em")
		      .attr("fill", "#bbb")
		      .attr("font-weight", "bold")
		      .attr("text-anchor", "start")
		      .text("Share of total (in %)");

		    // append data with tooltips
		    g.append("g")
			    .selectAll("g")
			    .data(data)
			    .enter().append("g")
			      .attr("transform", function(d) { return "translate(" + x0(d.Answer) + ",0)"; })
			    .selectAll("rect")
			    .data(function(d) { return keys.map(function(key) { return {key: key, value: d[key]}; }); })
			    .enter().append("rect")
			      	.attr("x", function(d) { return x1(d.key); })
			      	.attr("y", function(d) { return y(d.value); })
			      	.attr("width", x1.bandwidth())
			      	.attr("height", function(d) { return height - y(d.value); })
			      	.attr("fill", function(d) { return z(d.key); })
			     	.on("mouseover", function(d) {		
			            div.transition()		
			                .duration(200)		
			                .style("opacity", .9);		
			            div.html("Category: <strong>" +d.key + "</strong><br/>Value: <strong>"  + f(d.value)+"</strong>")	
			                .style("left", (d3.event.pageX) + "px")		
			                .style("top", (d3.event.pageY - 28) + "px");	
			            })					
		        	.on("mouseout", function(d) {		
		            	div.transition()		
		                	.duration(500)		
		                	.style("opacity", 0);	
		        	});

		    // render legend (if there are more than 4 elements, let's make it multiple lines)
			if (keys.length > 4) { 
				var legend = g.append("g")
		      	.attr("font-family", "sans-serif")
		      	.attr("font-size", 12)
		      	.attr("border","2px solid #ddd")
			    .selectAll("g")
			    	.data(keys.slice())
			    	.enter().append("g")
			      		.attr( "transform", function(d,i) { 
					        xOff = (i % 4) * 150
					        yOff = Math.floor(i  / 4) * 30
					        return "translate(" + xOff + "," + yOff + ")"
					    });
			} else {
				var legend = g.append("g")
		      	.attr("font-family", "sans-serif")
		      	.attr("font-size", 12)
			    .selectAll("g")
			    	.data(keys.slice())
			    	.enter().append("g")
			      		.attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
			}
			

		  	legend.append("rect")
		      	.attr("x", 20)
		      	.attr("y",height+70)
		      	.attr("width", 19)
		      	.attr("height", 19)
		      	.attr("fill", z);

		  	legend.append("text")
		      	.attr("x", 50)
		      	.attr("y", height+80)
		      	.attr("dy", "0.32em")
		      	.text(function(d) { return d; }); 

		} else {

			// define y domain
			y.domain([0, d3.max(data, function(d) { return d3.max(keys, function(key) { return d.Value; }); })]).nice();

			// append y axis
			g.append("g")
	      	.attr("class", "axis")
	      	.call(d3.axisLeft(y).ticks(5, "%").tickSize(-width))
		    .append("text")
		      .attr("x", 2)
		      .attr("y", y(y.ticks().pop()) +0.5)
		      .attr("dy", "0.32em")
		      .attr("fill", "#000")
		      .attr("fill", "#bbb")
		      .attr("font-weight", "bold")
		      .attr("text-anchor", "start")
		      .text("Share of total (in %)")

		    // append data with tooltips
			g.selectAll("rect")
			    .data(data)
			    .enter().append("rect")
			      	.attr("x", function(d) { return x0(d.Answer); })
			      	.attr("y", function(d) { return y(d.Value); })
			      	.attr("width", x0.bandwidth())
			      	.attr("height", function(d) { return height - y(d.Value); })
			      	.attr("fill", "#6CCB9F")
			      	.on("mouseover", function(d) {		
			            div.transition()		
			                .duration(200)		
			                .style("opacity", .9);		
			            div	.html("Answer: <strong>" +d.Answer + "</strong><br/>Value: <strong>"  + d.Value+"</strong>")	
			                .style("left", (d3.event.pageX) + "px")		
			                .style("top", (d3.event.pageY - 28) + "px");	
			            })					
		        	.on("mouseout", function(d) {		
		            	div.transition()		
		                	.duration(500)		
		                	.style("opacity", 0);	
		        	});
		}

		// add x axis
		g.append("g")
	      	.attr("class", "axis")
	      	.attr("transform", "translate(0," + (height) + ")")
	      	.call(d3.axisBottom(x0))
	      	.selectAll(".tick text")
  				.call(wrap, x0.bandwidth())
  				.attr("font-size","14px")
		
		  	

	}

	// Function to add data to the table-output tab
	function appendTable(data) {
		// remove existing tables and warnings
		$("table").remove();
		$('.sample-error').hide();

		// check if the data is aggregated
		if (data.type == "grouped") {
			
			var columns = data.columns;

			// format data correctly
			var f = d3.format(",.2%");
			data.forEach(function(d) {
				columns.forEach(function(c) {
					d[c]=f(d[c]);
				})
			})
			columns.splice(0,0,"Answer");

		} else {

			var columns = ['Answer','Value'];

			// format data correctly
			var f = d3.format(",.2%");
			data.forEach(function(d) {
				d.Value=f(d.Value);
			})
		}
			// create table
			var table = d3.select('#table-output').append('table');
			var thead = table.append('thead');
			var	tbody = table.append('tbody');

			// append the header row
			thead.append('tr')
			  .selectAll('th')
			  .data(columns).enter()
			  .append('th')
			    .text(function (column) { return column; });

			// create a row for each object in the data
			var rows = tbody.selectAll('tr')
			  .data(data)
			  .enter()
			  .append('tr');

			// create a cell in each row for each column
			var cells = rows.selectAll('td')
			  .data(function (row) {
			    return columns.map(function (column) {
			      return {column: column, value: row[column]};
			    });
			  })
			  .enter()
			  .append('td')
			    .text(function (d) { return d.value; });

			return table;
	}

	// function to wrap long labels
	function wrap(text, width) {
	  text.each(function() {
	    var text = d3.select(this),
	        words = text.text().split(/\s+/).reverse(),
	        word,
	        line = [],
	        lineNumber = 0,
	        lineHeight = 1.1, // ems
	        y = text.attr("y"),
	        dy = parseFloat(text.attr("dy")),
	        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em")
	    while (word = words.pop()) {
	      line.push(word)
	      tspan.text(line.join(" "))
	      if (tspan.node().getComputedTextLength() > width/2+30) {
	        line.pop()
	        tspan.text(line.join(" "))
	        line = [word]
	        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", `${++lineNumber * lineHeight + dy}em`).text(word)
	      }
	    }
	  })
	}

	function sampleError() {
		$('#dots').hide();
		$('.sample-error').hide();
		$('svg').remove();
		$('table').remove();
		$('.output').append('<div class="box box-solid box-warning sample-error"></div>');;
		var div = $('.sample-error');
		div.text("There isn't enough data for the filters you selected. Try changing the filtering criteria.");
	}

});	


