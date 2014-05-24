"use strict";

/* Draws a dependencyTree
 *
 * Can be used in isolation and awaits tokens passed into it, which have
 * a head.id property.
 *
 * The directive needs to be set on an svg element as attribute.
 *
 * Styling of the tree can be customized by passing a styles object as
 * attribute.
 * This object should be a dictionary of token ids with style information
 * in three categories: edge, label and token.
 * These properties should hold regular css style information. Example
 *
 *   {
 *     '0001' : {
 *       edge: { stroke: 'blue' },
 *       token: { color: 'white' }
 *     }
 *   }
 *
 * This would draw the edge of the token 0001 one blue and the textual
 * representation of the token itself in white.
 *
 * Tokens are rendered by the token directive. If no styles object has
 * been passed to the dependencyTree directive, the token itself will
 * decide its styling.
 * Hover and click events for tokens are activated. An option to customize
 * this will follow.
 *
 * Watches are in effect for changes of a tokens head.id value, changes
 * in the styles object, as well as in the tokens object.
 *
 * Example, given a tokens and a styles object in the current scope:
 *
 *   <svg dependency-tree tokens="tokens" styles="styles/>
 *
 */

/* global dagreD3 */

angular.module('arethusa.depTree').directive('dependencyTree', function($compile) {
  return {
    restrict: 'A',
    scope: {
      tokens: '=',
      styles: '='
    },
    link: function(scope, element, attrs) {
      function tokenPlaceholder(token) {
        return '<div class="node" id="tph' + token.id + '">' + token.string + '</div>';
      }

      function labelPlaceholder(token) {
        var label = generateLabel(token);
        var id = token.id;
        return '<div id="' + labelId(id) + '" class="tree-label">' + label + '</div>';
      }

      function generateLabel(token) {
        return (token.relation || {}).label;
      }

      function tokenHasCustomStyling(token) {
        var t = scope.styles[token.id] || {};
        return t.token;
      }

      function applyTokenStyling(childScope, token) {
        childScope.style = scope.styles[token.id].token;
      }

      // Right now this function is responsible for managing the label and
      // edge colors when a custom styling is available.
      //
      // Once the relation plugin is ready, the label will be handled by
      // a directive that is coming from there.
      //
      // The directive will only stay responsible for the edges.
      //
      // If an edge style is overridden, we safe the old value in the
      // styleResets object. the resetEdgeStyling() function will now
      // how to operate with this then.
      var styleResets = {};

      function applyCustomStyling() {
        var edges = vis.selectAll("g.edgePath path");
        angular.forEach(scope.styles, function(style, id) {
          var labelStyle = style.label;
          var edgeStyle = style.edge;

          if (labelStyle) {
            label(id).style(labelStyle);
          }

          if (edgeStyle) {
            saveOldEdgeStyles(id, edgeStyle);
            edge(id).style(edgeStyle);
          }
        });
      }

      function saveOldEdgeStyles(id, properties) {
        if (properties) {
          var e = edge(id);
          var style = {};
          angular.forEach(properties, function(_, property) {
            style[property] = e.style(property);
          });
          styleResets[id] = style;
        }
      }

      function compiledEdgeLabel(token) {
        var template = '<span value-watch target="obj" property="label"></span>';
        var childScope = scope.$new();
        childScope.obj = token.relation;
        return $compile(template)(childScope)[0];
      }

      function compiledToken(token) {
        var childScope = scope.$new();
        childScope.token = token;

        // Ugly but working...
        // We replace the colorize value in our token template string.
        // If custom styles are given, we check if one is available for
        // this token. If yes, we use it, otherwise we just pass one
        // undefined which leaves the token unstyled.
        //
        // Without custom styles we let the token itself decide what color
        // it has.
        var style;
        if (scope.styles) {
          if (tokenHasCustomStyling(token)) {
            applyTokenStyling(childScope, token);
          } // else we just stay undefined
          style = 'style';
        } else {
          style = 'true';
        }
        return $compile(tokenHtml.replace('STYLE', style))(childScope)[0];
      }

      var tokenHtml = '\
        <span\
          token="token"\
          colorize="STYLE"\
          click="true"\
          hover="true">\
        </span>\
      ';

      // Creating the node set

      // g will hold the graph and be set when new tokens are loaded,
      // vis will be it's d3 representation
      var g;
      var vis;

      function createNodes() {
        g.addNode("0000", { label: "[-]"});
        angular.forEach(scope.tokens, function(token, index) {
          g.addNode(token.id, { label: tokenPlaceholder(token) });
        });
      }

      function createEdges() {
        angular.forEach(scope.tokens, function(token, index) {
          if (token.head) {
            drawEdge(token);
          }
        });
      }

      function edges() {
        return vis.selectAll("g.edgePath path");
      }

      function edge(id) {
        return vis.select('#' + edgeId(id));
      }

      function edgeId(id) {
        return 'tep' + id;
      }

      function label(id) {
        return vis.select('#' + labelId(id));

      }

      function labelId(id) {
        return 'tel' + id;
      }

      function nodes() {
        return vis.selectAll("div.node");
      }

      function drawEdge(token) {
        g.addEdge(token.id, token.id, token.head.id, { label: labelPlaceholder(token) });
      }

      function updateEdge(token) {
        g.delEdge(token.id);
        drawEdge(token);
      }

      function resetEdgeStyling() {
        angular.forEach(styleResets, function(style, id) {
          edge(id).style(style);
        });
        styleResets = {}; // clean up, to avoid constant resetting
      }

      function createGraph() {
        g = new dagreD3.Digraph();
        createNodes();
        createEdges();
        render();
      }

      // Initialize the graph

      var layout = dagreD3.layout().rankDir("BT");
      var svg = d3.select(element[0]);
      svg.call(d3.behavior.zoom().on("zoom", function() {
         var ev = d3.event;
         svg.select("g")
           .attr("transform",
                 "translate(" + ev.translate + ") scale(" + ev.scale + ")");
      }));

      var renderer = new dagreD3.Renderer();

      function insertTokenDirectives() {
        nodes().append(function() {
          // This is the element we append to and we created as a placeholder
          // We clear out its text content so that we can display the content
          // of our compiled token directive.
          // The placholder has an id in the format of tphXXXX where XXXX is the id.
          this.textContent = "";
          return compiledToken(scope.tokens[this.id.slice(3)]);
        });
      }

      function insertEdgeDirectives() {
        angular.forEach(scope.tokens, function(token, id) {
          label(id).append(function() {
            this.textContent = "";
            return compiledEdgeLabel(token);
          });
        });

      }

      function render() {
        vis = svg.select('g');
        renderer.layout(layout).run(g, vis);

        // Customize the graph so that it holds our directives

        insertTokenDirectives();
        insertEdgeDirectives();

        // Not very elegant, but we don't want marker-end arrowheads right now
        // We also place an token edge path (tep) id on these elements, so that
        // we can access them more easily later on.
        edges().each(function(id) {
          angular.element(this).attr('id', edgeId(id));
        }).attr('marker-end', '');
      }

      angular.forEach(scope.tokens, function(token, id) {
        var childScope = scope.$new();
        childScope.token = token.id;
        childScope.head =  token.head;
        childScope.$watch('head.id', function(newVal, oldVal) {
          // Very important to do here, otherwise the tree will
          // be render a little often on startup...
          if (newVal !== oldVal) {
            updateEdge(token);
            render();
          }
        });
      });

      scope.$watch('tokens', function(newVal, oldVal) {
        createGraph();
      });

      scope.$watch('styles', function(newVal, oldVal) {
        if (newVal !== oldVal) {
          render();
          if (newVal) {
            applyCustomStyling();
          } else {
            resetEdgeStyling();
          }
        }
      });
    },
    template: '<g transform="translate(20,20)"/>'
  };
});