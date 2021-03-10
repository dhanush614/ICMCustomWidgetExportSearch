define([ "dojo/_base/declare",
		"dojo/_base/connect",
		"dojo/_base/array",
		"dojo/_base/lang",
		"dojo/dom-class",
		"dojo/dom-style",
		"dojo/aspect",
		"dojo/sniff",
		"dojo/text!./templates/CaseInfoContentPaneMobile.html",
		"dojo/text!./templates/CaseInfoContentPane.html",
		"icm/base/_BaseWidget",
		"icm/base/BaseActionContext",
		"icm/pgwidget/caseinfo/dijit/header/CaseInfoHeader",
		"icm/pgwidget/caseinfo/dijit/summary/CaseInfoSummaryContentPane",
		"icmcustom/pgwidget/caseinfo/dijit/documents/CaseInfoDocumentsContentPane",
		"icm/pgwidget/caseinfo/dijit/activities/CaseInfoActivitiesContentPane",
		"icm/pgwidget/caseinfo/dijit/history/CaseInfoHistoryContentPane",
		"dojo/has!ios?dojox/mobile/TabBar:dojo/sniff" ], function(declare, connect, array, lang, domClass, domStyle, aspect, sniff, mobileTemplate, template, _BaseWidget, BaseActionContext, CaseInfoHeader, CaseInfoSummaryContentPane, CaseInfoDocumentsContentPane, CaseInfoActivitiesContentPane, CaseInfoHistoryContentPane) {

	/**
	 * This is the main UI widget that displays the different tabs - Summary,
	 * Documents, Tasks, History
	 * @class
	 * @name icm.pgwidget.caseinfo.dijit.CaseInfoContentPane
	 */
	return declare("icmcustom.pgwidget.caseinfo.dijit.CaseInfoContentPane", [ _BaseWidget,
			BaseActionContext ], /** @lends icm.pgwidget.caseinfo.dijit.CaseInfoContentPane.prototype */ {

		templateString : sniff("ios") ? mobileTemplate : template,
		widgetsInTemplate : true,

		/**
		 * Tabs to be displayed in the widgets
		 */
		tabDefinitions : {},

		constructor : function() {
			console.log("From CaseInfoContentPane script");
			this.resourceBundle = icm.util.Util.getResourceBundle("caseInfo");
		},

		/**
		 * Sets the model on the Case Information widget
		 * 
		 * @param model -
		 *            Object that includes the following properties
		 *            model.caseEditable - An instance of
		 *            icm.model.CaseEditable that represents the case to be
		 *            displayed model.taskEditable - An instance of
		 *            icm.model.TaskEditable that represents the task associated
		 *            with the case model.workItemEditable - An instance
		 *            of icm.model.WorkItemEditable that represents the work
		 *            item associated with the case model.caseId -- Case
		 *            Identifier
		 */
		setModel : function(model) {
			this.logEntry("setModel");
			this.model = model;
			this.logExit("setModel");
		},

		postCreate : function() {
			console.log("CaseinfoContentPane js");
			this.logEntry("postCreate");
			this._customTabs = []; // For custom tab
			this._caseinfoTabs = []; // ICM tabs
			this._caseCanOpen = true;

			this.inherited(arguments);

			this.logExit("postCreate");
		},
		
		startup: function() {
			this.inherited(arguments);
			// Load OOTB tabs
			array.forEach(this.tabDefinitions, function(tabDefinition) {
				if (tabDefinition.visibility) {
					var id = tabDefinition.id;
					var definitionId = id == "Activities" ? "Tasks" : id; // Convert
																			// "Activities"
																			// to
																			// "Tasks"
					var lComponentName = id.toLowerCase();
					if(lComponentName=="documents")
					{
						var className = "icmcustom.pgwidget.caseinfo.dijit." + lComponentName + ".CaseInfo" + id + "ContentPane";
					}else{
						var className = "icm.pgwidget.caseinfo.dijit." + lComponentName + ".CaseInfo" + id + "ContentPane";
					}
					var classDef = lang.getObject(className);
					var classObj = new classDef({
						title : this.resourceBundle[lComponentName + "Name"],
						componentName : lComponentName,
						resourceBundle : this.resourceBundle,
						context : this,
						definitionId : definitionId
					});
					this._caseinfoTabs.push(classObj);
				}
			}, this);

			// Add custom tabs
			if (this._customTabs && this._customTabs.length > 0) {
				this._caseinfoTabs = this._caseinfoTabs.concat(this._customTabs);
			}
			this.tabContainer.startup();
			array.forEach(this._caseinfoTabs, function(component) {
				this.tabContainer.addChild(component);
				if(this._caseinfoTabs.length == 1 && this.widgetProperties.NonTabDisplay === true){
					domStyle.set(component.controlButton.domNode, "display", "none");
				}
			}, this);

			this.tabContainer.resize();
			this._connectEvents();	
		},

		savePosition : function(e) {
			this.startHPostion = e.clientX;
			this.startVPostion = e.clientY;
		},

		deletePosition : function(e) {
			this.startHPostion = null;
			this.startVPostion = null;
		},

		touchScroll : function(e) {
			if (this.startHPostion && this.startVPostion) {
				this.domNode.parentNode.scrollTop += this.startVPostion - e.clientY;
				this.domNode.parentNode.scrollLeft += this.startHPostion - e.clientX;
				this.startHPostion = e.clientX;
				this.startVPostion = e.clientY;
			}
		},

		/* icm code start */
		linked : function(childIndex) {
			var children = this.tabContainer.getChildren();
			var child = children[childIndex];
			this.tabContainer.selectChild(child);
		}, /* icm code end */

		showHideCaseInfoHeader : function() {
			this.logEntry("showHideCaseInfoHeader");
			if (this.widgetProperties.caseInfoShowCaseId === true) {
				this.caseInfoCaseHeader.show();
			} else {
				this.caseInfoCaseHeader.hide();
			}
			this.logExit("showHideCaseInfoHeader");
		},

		render : function() {
			this.logEntry("render");
			
			// Render header
			var currCase = this.model.caseEditable.getCase();
			currCase.retrieveMembershipStatus (lang.hitch (this, function (memberStatus) {
				this._caseCanOpen = memberStatus.canOpenCase();
				this.caseInfoCaseHeader.setCaseId(this.model.caseTitle, this._caseCanOpen);
			}));
			
			// render tabs
			array.forEach(this._caseinfoTabs, function(component) {
				component.setModel(this.model);
				if (sniff("ios")) {
					/* icm code start */
					var childIndex = this.tabMobile.getChildren().length;
					var icon = "mblDomButton" + component.title;
					var alreadyExists = false;
					array.forEach(this.tabMobile.getChildren(), function(child) {
						if (child.icon == icon && child.label == component.title) {
							alreadyExists = true;
						}
					}, this);
					if (!alreadyExists) {
						var tabbutton = new dojox.mobile.TabBarButton({
							label : component.title,
							childIndex : childIndex,
							icon : icon
						});
						tabbutton.on("click", function(e) {
							this.getParent().getParent().linked(this.childIndex);
						});
						this.tabMobile.addChild(tabbutton);
					}

					/* icm code end */
				}
			}, this);

			if (sniff("ios")) {
				/* icm code start */
				this.tabContainer.tablist.tablistWrapper.hidden = true;
				var children = this.tabMobile.getChildren();
				var adaptedSize = "10px";
				switch (children.length) {
				case 1:
				case 2:
					adaptedSize = "18px";
					break;
				case 3:
					adaptedSize = "15px";
					break;
				case 4:
					adaptedSize = "12px";
					break;
				}
				var size = 100 / children.length - 3;
				for ( var i = 0; i < children.length; ++i) {
					children[i].set("style", "width:" + size.toString() + '%');
					children[i].domNode.children[1].style.fontSize = adaptedSize;
				}
				var curSelectd = 0;
 				var curTab=0;
 				array.forEach(this._caseinfoTabs, function (component) {
 					if(component.selected){
 						curSelectd = curTab;
 					}
 					curTab++;
 				});
 				children[curSelectd].set("selected", true);
				/* icm code end */
			}

			this.tabContainer.resize();
			this.logExit("render");
		},
		/**
		 * Sets the tab definitions for the widget
		 * 
		 * @tabDefinitions - An array of tab definitions. Each tab definition
		 *                 has the following properties id: A unique identifier
		 *                 for the tab visibility: boolean value indicating
		 *                 whether the tab is to be displayed
		 * 
		 */
		setTabDefinitions : function(tabDefinitions) {
			this.logEntry("setTabDefinitions");
			this.tabDefinitions = tabDefinitions;
			this.logExit("setTabDefinitions");
		},

		/**
		 * Return all children dijit on Tab
		 * 
		 * @return {array} [all widgets]
		 */
		getChildWidgets : function() {
			this.logEntry("getChildWidgets");
			return this._caseinfoTabs;
			this.logExit("getChildWidgets");
		},

		/**
		 * Return specified tab in the TabContainer tabName is the definitionId.
		 */
		getTab : function(tabName) {
			this.logEntry("getTab");
			var tabDijit = null;
			array.forEach(this._caseinfoTabs, function(tab) {
				if (tab.definitionId === tabName) {
					tabDijit = tab;
				}
			}, this);
			this.logExit("getTab");
			return tabDijit;
		},

		/**
		 * Event fired when a tab is selected
		 */
		onClickTab : function(tab) {
			this.logEntry("onClickTab");
			tab.onClickTab();
			this.logExit("onClickTab");
		},

		resize : function(size) {
			this.logEntry("resize");
			this.onResize();
			this.tabContainer.resize();
			this.logExit("resize");
		},

		onResize : function() {
			this.logEntry("onResize");
			if (!this.autoHeight) {
				var height = this.domNode.clientHeight - this.caseInfoCaseHeader.clientHeight - 20;
				if (sniff("ios")) {
					height -= this.tabMobile.domNode.clientHeight;
					/* RTC 108471 */
					if (this.domNode.style.height != "auto") {
						domStyle.set(this.domNode, "margin-bottom", "-15px");
					}
					/* RTC 108471 */
				}
				if (height > 0) {
					domStyle.set(this.tabContainer.domNode, "height", height + "px");
				}
			} else {
				/* icm code start */
				if (sniff("ios")) {
					this.contentNode.style.height = "auto";
				}
				/* icm code end */
			}
			this.logExit("onResize");
		},

		onClickOpenCaseDetails : function() {
			this.logEntry("onClickOpenCaseDetails");
			this.logExit("onClickOpenCaseDetails");
		},

		_clickOpenCaseDetails : function() {
			this.logEntry("_clickOpenCaseDetails");
			this.onClickOpenCaseDetails();
			this.logExit("_clickOpenCaseDetails");
		},

		_connectEvents : function() {
			this.logEntry("_connectEvents");
			this._selectHandler = aspect.after(this.tabContainer, "selectChild", lang.hitch(this, this.onClickTab), true);
			this._clickOpenHandler = aspect.after(this.caseInfoCaseHeader, "onClickOpenCaseDetails", lang.hitch(this, this._clickOpenCaseDetails), true);
			// For mobile
			if (sniff("ios")) {
				this.connect(this.domNode, dojo.touch.press, "savePosition");
				this.connect(this.domNode, dojo.touch.move, "touchScroll");
				this.connect(this.domNode, dojo.touch.release, "deletePosition");
			}
			this.logExit("_connectEvents");
		},
		
		destroyRecursive: function() {
			this.inherited(arguments);
		},

		destroy : function() {
			this.logEntry("destroy");
			delete this._customWidgets; // Custom tabs
			delete this._caseinfoTabs; // ICM tabs
			delete this.model;
			this._clickOpenHandler && this._clickOpenHandler.remove();
			delete this._clickOpenHandler;
			this._selectHandler  && this._selectHandler.remove();
			delete this._selectHandler;

			this.inherited(arguments);

			this.logExit("destroy");
		},

		_eoc_ : null
	});
});
