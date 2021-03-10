define([
	"dojo/_base/declare",
	"dojo/json",
	"icm/base/BasePageWidget",
	"icm/base/_BaseWidget",
	"dojo/text!./templates/ICMCustomWidget.html",
	"dijit/form/Button"
], function(declare, json, BasePageWidget, _BaseWidget, template){
	return declare("icmcustom.pgwidget.ICMCustomWidget", [_BaseWidget, BasePageWidget], {
		templateString: template,

		postCreate: function(){
		}
	});
});
