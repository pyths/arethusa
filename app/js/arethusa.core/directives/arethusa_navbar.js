'use strict';
/* Configurable navbar
 *
 * The following variables can be declared in a conf file
 *   disable - Boolean
 *   search - Boolean
 *   navigation - Boolean
 *   notifier - Boolean
 *   template - String
 *
 * Example;
 *
 * {
 *   "navbar" : {
 *     "search" : true,
 *     "navigation" : true,
 *     "template" : "templates/navbar.html"
 *   }
 *
 */
angular.module('arethusa.core').directive('arethusaNavbar', [
  'configurator',
  function (configurator) {
    return {
      restrict: 'AE',
      scope: true,
      link: function (scope, element, attrs) {
        var conf = configurator.configurationFor('navbar');
        scope.template = conf.template;
        scope.disable = conf.disable;
        scope.showSearch = function () {
          return conf.search;
        };
        scope.showNavigation = function () {
          return conf.navigation;
        };
        scope.showNotifier = function () {
          return conf.notifier;
        };

        // Foundation's topbar doesn't seem to work properly - could be an issue
        // with angular. If we make it fixed, it overlaps our body and no padding
        // is added. We do it manually through this directive.
        angular.element(document.body).css({ padding: '45px'});
      },
      template: '<div ng-if="! disable" ng-include="template"></div>'
    };
  }
]);
