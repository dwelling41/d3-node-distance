var DEGREES_TO_RADIANS = Math.PI / 180;
var RADIANS_TO_DEGREES = 180 / Math.PI;

// Determines if a node is being dragged
var isNodeDragging = false;

// Holds the currently selected node
var currentlySelectedNode = null;

// Determines if in edit mode or not
var inEditMode = false;

var colors = d3.scale.category10();

// set up initial nodes and links
//  - nodes are known by 'id', not by index in array.
//  - links are always source < target; edge directions are set by 'left' and 'right'.
var nodes = [];
var lastNodeId = 0;
var links = [];


// Setup height and width
var MAX_HEIGHT = 400;
var margin = {
    top: 25,
    right: 25,
    bottom: 25,
    left: 25
};
var outerWidth = $('#scatter').width();
var outerHeight = MAX_HEIGHT;
var width = outerWidth - margin.left - margin.right;
var height = outerHeight - margin.top - margin.bottom;


var force = d3.layout.force()
    .size([width, height])
    .charge(-400)
    .linkDistance(40)
    .on("tick", tick);

var drag = force.drag()
    .on('dragstart', function() {
        isNodeDragging = true;
    })
    .on('dragend', function() {
        isNodeDragging = false;
    })


var svg = d3.select("#scatter").append("svg")
    .attr("width", width)
    .attr("height", height)
    .on('mousedown', onContentMousedown);

var link = svg.selectAll(".link"),
    node = svg.append('svg:g').selectAll('g');

force
    .nodes(nodes)
    .links(links)



function tick() {
    link.attr("x1", function(d) {
            return d.source.x;
        })
        .attr("y1", function(d) {
            return d.source.y;
        })
        .attr("x2", function(d) {
            return d.target.x;
        })
        .attr("y2", function(d) {
            return d.target.y;
        });

    node.attr('transform', function(d) {
        return 'translate(' + d.x + ',' + d.y + ')';
    });
}


function drawContent() {
    // Add/update Links
    link = link.data(links);
    link.enter().insert("line", ".node").attr("class", "link");
    link.exit().remove();

    // Get node data
    node = node.data(nodes, function(d) {
        return d.id;
    });

    // update existing nodes 
    node.selectAll('circle')
        .attr('fill', function(d) {
            return d.nodeColor;
        })
        .classed('selected', function(d) {
            return d === currentlySelectedNode;
        });;


    node.selectAll('text.nodeWeight')
        .attr("x", 0)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .attr('class', 'nodeWeight')
        .text(function(d) {
            return d.nodeWeight;
        });

    node.selectAll('text.label')
        .attr("x", 30)
        .attr("dy", ".35em")
        .attr('class', 'label')
        .text(function(d) {
            return d.label;
        });

    // add new nodes
    var g = node.enter()
        .append('svg:g')
        .classed('nodeContainer', true)
        .classed('draggable', true)
        .on('contextmenu', onRightClickNode)
        .call(drag);

    g.append('svg:circle')
        .attr('fill', function(d) {
            return d.nodeColor;
        })
        .attr('class', 'node')
        .attr('r', 25)

    g.append('svg:text')
        .attr("x", 0)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .attr('class', 'nodeWeight')
        .text(function(d) {
            return d.nodeWeight;
        });

    g.append('svg:text')
        .attr("x", 30)
        .attr("dy", ".35em")
        .attr('class', 'label')
        .text(function(d) {
            return d.label;
        });


    // remove old nodes
    node.exit().remove();

    // Run the update
    force.start();
}



function onContentMousedown() {
    // Make sure a node isn't being dragged
    if (isNodeDragging) {
        return;
    };

    // make sure we aren't in edit mode
    if (inEditMode) {
        return;
    }

    // Validate inputs and exit if invalid
    var error = validateNodeManagementControls();
    if (error.length > 0) {
        toastr.error(error);
        return;
    };

    // Get the nodes position
    var point = d3.mouse(this)

    // Get the node color
    var nodeColor = getInitialColor(point[0], point[1]);

    // Create the new node
    var node = {
        id: ++lastNodeId,
        x: point[0],
        y: point[1],
        fixed: true,
        label: $('#labelInput').val(),
        nodeWeight: parseInt($('#weightInput').val()),
        nodeColor: nodeColor
    };

    // Add the node to the tracked list
    nodes.push(node);

    // Clear the input
    resetNodeManagementControls();

    // Redraw
    drawContent();

    toastr.success("Node created!");
}


// [min, max] => [floor, ceil]
// ((ceil - floor) * (x - minimum))/(maximum - minimum) + floor
function normalize(value, min, max, floor, ceiling) {
    return ((ceiling - floor) * (value - min)) / (max - min) + floor;
}

function getInitialColor(x, y) {
    // Map our coordinates of [0, Width] and [0, Height] to [-W/2, W/2] and [-H/2, H/2] to give a full range of HSL angles
    var coord_x = normalize(x, 0, width, -width / 2, width / 2);
    var coord_y = normalize(y, 0, height, height / 2, -height / 2);

    // Get polar coordinates
    var radius = Math.sqrt(Math.pow(coord_x, 2) + Math.pow(coord_y, 2));
    var max_radius = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
    var radius_normalized = normalize(radius, 0, max_radius, 0, 100);

    var theta = Math.atan2(coord_y, coord_x);
    var theta_360 = (theta > 0 ? theta : (2 * Math.PI + theta)) * 360 / (2 * Math.PI)

    // Return the HSL as hex
    var hslString = "hsl(" + theta_360 + ", " + radius_normalized + "%," + "50%)";
    var color = "#" + tinycolor(hslString).toHex();

    console.log(color);
    return color;
}


function onRightClickNode(clickedNode) {
    // Stop normal events
    d3.event.preventDefault();

    // Exit if dragging
    if (isNodeDragging) {
        return;
    };


    // Set currently selected
    currentlySelectedNode = clickedNode;

    // Fill properties
    $('#weightInput').val(clickedNode.nodeWeight);
    $('#labelInput').val(clickedNode.label);
    $('#colorInput').colorpicker('setValue', clickedNode.nodeColor);

    // Show save button and put in edit mode
    inEditMode = true;
    $('#saveEditBtn').show();
    $('#cancelEditBtn').show();
    $('#deleteEditBtn').show();
    $('#colorInputGroup').show();

    //Refresh
    drawContent();
}

function initialize() {
    // Setup color picker
    $('#colorInput').colorpicker();

    // Set default values
    resetNodeManagementControls();

    // Setup event handlers
    $('#saveEditBtn').on('click', onSaveEdit);
    $('#cancelEditBtn').on('click', onCancelEdit);
    $('#deleteEditBtn').on('click', onDeleteEdit);

    drawContent();

}

function onSaveEdit() {
    // Validate inputs and exit if invalid
    var error = validateNodeManagementControls();
    if (error.length > 0) {
        toastr.error(error);
        return;
    };

    // Save off values
    currentlySelectedNode.label = $('#labelInput').val();
    currentlySelectedNode.nodeWeight = parseInt($('#weightInput').val());
    currentlySelectedNode.nodeColor = $('#colorInput').colorpicker('getValue');

    // Clear the input
    resetNodeManagementControls();

    currentlySelectedNode = null;

    // Redraw
    drawContent();

    toastr.success("Save successful!");

}

function onCancelEdit() {
    // Clear currently selected
    currentlySelectedNode = null;

    // Clear the input
    resetNodeManagementControls();

    // Redraw
    drawContent();
}

function onDeleteEdit() {
    // Confirm
    if (!confirm("Are you sure you want to delete this node?")) {
        return;
    }

    // Delete the node
    var nodeIndex = _.findIndex(nodes, currentlySelectedNode);
    if (nodeIndex >= 0) {
        nodes.splice(nodeIndex, 1);
    };

    // Delete all associated links
    links = _.filter(links, function(curLink) {
        return curLink.source.id != currentlySelectedNode.id && curLink.target.id != currentlySelectedNode.id;
    });

    // Clear the input
    resetNodeManagementControls();

    // Redraw
    drawContent();

}


function resetNodeManagementControls() {
    // Setup initial control values
    $('#weightInput').val('100');
    $('#labelInput').val('tag_' + (lastNodeId + 1));
    $('#saveEditBtn').hide();
    $('#cancelEditBtn').hide();
    $('#deleteEditBtn').hide();
    $('#colorInputGroup').hide();
    $('#colorInput').colorpicker('setValue', '#00aabb');
    inEditMode = false;
}


function validateNodeManagementControls() {
    // Verify weight input set between 0 and 100
    var weightInput = parseInt($('#weightInput').val());
    if (!weightInput || weightInput < 0 || weightInput > 100) {
        return 'Please provide a valid weight input between 0 and 100';
    };

    // Verify label is set
    var labelInput = $('#labelInput').val();
    if (!labelInput || labelInput.length <= 0) {
        return 'Please provide a label';
    };

    // Verify label doesn't exist
    var existingLabelIndex = _.findIndex(nodes, function(curNode) {
        // Ignore current node if one is selected
        return currentlySelectedNode ?
            curNode.label === labelInput && curNode != currentlySelectedNode :
            curNode.label === labelInput;
    });

    if (existingLabelIndex >= 0) {
        return 'Please provide a unique label';
    };

    // Valid otherwise
    return '';
}


$(document).ready(initialize);