define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/event",
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/keys",
	"dojo/aspect",
	"dojo/dom-style",
	"dojo/dom-class",
	"dojo/dom-geometry",
	"dojo/dom-construct",
	"dojo/on",
	"dojo/sniff",
	"dojo/string",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/registry",
	"dijit/layout/ContentPane",
	"dijit/layout/BorderContainer",
	"idx/layout/BorderContainer",
	"gridx/Grid",
	"gridx/allModules",
	"dojox/grid/enhanced/plugins/CellMerge",
	"gridx/core/model/cache/Async",
	"dojo/_base/Deferred",
	"ecm/widget/listView/gridModules/Body",
	"ecm/widget/listView/gridModules/ColumnWidth",
	"gridx/modules/ColumnResizer",
	"gridx/modules/Focus",
	"gridx/modules/move/Row",
	"gridx/modules/select/Row",
	"gridx/modules/IndirectSelect",
	"gridx/modules/RowHeader",	
	"ecm/widget/listView/gridModules/ExtendedSelectRow",
	"ecm/widget/listView/gridModules/TouchVScroller",	
	"ecm/widget/listView/gridModules/VirtualVScroller",
	"gridx/modules/IndirectSelectColumn",
	"gridx/modules/CellWidget",
	"idx/html",
	"ecm/LoggerMixin",
	"ecm/MessagesMixin",
	"ecm/model/_SearchTemplateBase",
	"icmcustom/model/ContentItem",
	"ecm/model/Desktop",
	"ecm/widget/layout/HorizontalScrollPane",
	"ecm/widget/Breadcrumb",
	"ecm/widget/ChildComponentSelector",
	"ecm/widget/ContentListDropDownDialog",
	"ecm/widget/listView/decorators/MagazineViewDecorator",
	"ecm/widget/listView/decorators/DetailsViewDecorator",
	"ecm/widget/listView/decorators/CommentViewDecorator",
	"ecm/widget/listView/decorators/BookmarkViewDecorator",
	"dojo/text!./templates/ContentList.html"
			 
], function(declare, //
lang, //
event, //
array, //
connect,//
keys, //
aspect, //
domStyle, //
domClass, //
domGeom, //
domConstruct, //
on, //
has, //
string, //
_TemplatedMixin, //
_WidgetsInTemplateMixin, //
registry, //
ContentPane, //
BorderContainer, //
IDXBorderContainer, //
Grid, 
modules,
cellMerge,//
Cache,
Deferred, //
Body, //
ColumnWidth, //
ColumnResizer, //
Focus, //
MoveRow, //
SelectRow,
IndirectSelect,
RowHeader, //
ExtendedSelectRow,
TouchVScroller, //
VirtualVScroller, //
IndirectSelectColumn, //
CellWidget, //
idxHtml, //
LoggerMixin, //
MessagesMixin, //
_SearchTemplateBase, //
ContentItem,
Desktop, //
HorizontalScrollPane, //
Breadcrumb,
ChildComponentSelector,
ContentListDropDownDialog, //
MagazineViewDecorator, //
DetailsViewDecorator, //
CommentViewDecorator, //
BookmarkViewDecorator, //
template) {
	
	Grid.extend({
		_connectEvents: function(node, connector, scope){
			for(var t = this,
					m = t.model,
					eventName,
					eventNames = t._eventNames,
					len = eventNames.length,
					i = 0; i < len; ++i){
				eventName = eventNames[i];
				if(!(this.frmPage=="FolderTreeGrid"&&eventName=="DblClick"))
				m._cnnts.push(on(node, eventName.toLowerCase(), lang.hitch(scope, connector, eventName)));
			}
		},
	});
	/**
	 * @name ecm.widget.listView.ContentList
	 * @class Provides a widget that displays the results of a search, the contents of a folder, the work items in a
	 *        work list, lists of teamspaces, and so on. This widget can be used to navigate folders and launch actions
	 *        for the items that are displayed. The widget provides the ability to enable multiple content views.
	 * @augments dijit._Widget, dijit._TemplatedMixin, dijit._WidgetsInTemplateMixin, ecm.MessagesMixin
	 */
	var ContentList = declare("icmcustom.widget.listView.ContentList", [
			 
		BorderContainer,
		_TemplatedMixin,
		ContentItem,
		_WidgetsInTemplateMixin,
		LoggerMixin,
		MessagesMixin
	], {
		/** @lends ecm.widget.listView.ContentList.prototype */

		templateString: template,

		gutters: false,

		widgetsInTemplate: true,

			  
		/**
		 * Message displayed in the grid if there are no results.
		 */
		emptyMessage: "",
		/**
		 * Indicates if the grid supports multiple or single selection.
		 */
		multiSelect: true,

		/**
		 * If true, when the result set is displayed, automatically select the first row.
		 */
		selectFirstRowOnSetResult: false,
		
		/**
		 * If true, checkboxes are displayed for row selection.
		 */
		showCheckboxes: false,

		/**
		 * If true, the grid will not display the header row.
		 * 
		 * @since 2.0.3.5
		 */
		headerHidden: false,

		/**
		 * List of core modules. Filled out in the constructor.
		 */
		coreModules: null,

		/**
		 * @private List of grid modules to load when the grid is created.
		 */
		_gridExtensionModules: null,

		/**
		 * @private List of content list modules to load.
		 */
		_contentListModules: null,

		/**
		 * @private An instance of {@link ecm.model.ResultSet}.
		 */
		_resultSet: null,

		/**
		 * Handle to the {@link gridx.Gridx} object for details and magazine views.
		 * 
		 * @since 2.0.2
		 */
		grid: null,

		/**
		 * A Boolean value indicating whether HTML characters are escaped in the structure name. Default is true. If you
		 * are using HTML tags in the structure name to display icons or formatted text, set this value to false so that
		 * the HTML tags are applied.
		 * 
		 * @since 2.0.3
		 */
		escapeStructureName: true,

		/**
		 * A Boolean value indicating whether HTML characters are escaped in the cell. Default is true. If you are using
		 * HTML tags in the cell data to display icons or formatted text, set this value to false so that the HTML tags
		 * are applied.
		 * 
		 * @since 2.0.3.2
		 */
		escapeCellData: true,

		/**
		 * @deprecated This was a private handle in release 2.0.1, but it was referenced inside decorators. Therefore
		 *             this handle will remain for backwards compatibility, but custom decorators should use the public
		 *             handle "grid" instead of "_grid".
		 */
		_grid: null,

		/**
		 * @private
		 */
		_detailsView: null,

		/**
		 * @private
		 */
		_selectRowTriggerOnCell: false,

		/**
		 * @private Has this.declaredClass. Used to determine the subdirectory containing the ICN decorators and
		 *          editors.
		 */
		_thisDeclaredClass: "ecm.widget.listView.ContentList",

		/**
		 * @private
		 */
		_magazineView: null,
		
		/**
		 * @private Used to enable/disable the showing of the checkboxes for rows selection.
		 */
		_allowCheckboxes: false,

		constructor: function() {
   
			if (!this.coreModules) {
				this.coreModules = [
					MoveRow,
					modules.Tree,
					IndirectSelect,
					RowHeader,
				];
				if (has("ecmMobile")) {
				    // Conditionally load this class. Just loading TouchVScroller under 
				    // the ICN web client (not mobile) includes mobile modules that cause
				    // error messages to appear in the console.
					require([ "ecm/widget/listView/gridModules/TouchVScroller" ],
							lang.hitch(this, function(TouchVScroller) {
								this.coreModules.push(TouchVScroller);
							})
					);
				} else {
					this.coreModules.push({
						moduleClass: VirtualVScroller,
						lazyTimeout: 25,   // timeout for the "lazy" argument - the smaller the number, the smoother of the scrolling when hold the vertical scroller and drags it up/down
						lazy: true
					});
				}
			}
			if (!this._gridExtensionModules) {
				this._gridExtensionModules = [];
			}
			if (!this._contentListModules) {
				this._contentListModules = [];
			}
		},

		/**
		 * Called after widget creation to connect {@link ecm.model.Desktop} events.
		 */
		postCreate: function() {
  
			this.inherited(arguments);
			
			// Show the checkboxes on the content list if all 3 conditions are true:
			// 1) flag 'showCheckboxes' is set in this instance
			// 2) flag to have checkboxes enabled in Desktop Layout configuration
			// 3) multi-selection is allowed on this grid
			/*if (this.showCheckboxes && Desktop.showContentListCheckbox && this.multiSelect) {
				this._allowCheckboxes = true;
				domClass.add(this.gridArea.domNode, "contentListWithIndirectSelectionCheckBox");
			}*/
			
			this.own(aspect.after(Desktop, "onFavoriteUpdated", lang.hitch(this, "_onChange"), true));
			this.own(aspect.after(Desktop, "onFavoritesRemoved", lang.hitch(this, "_onChange"), true));
			this.own(aspect.after(Desktop, "onFavoriteAdded", lang.hitch(this, "_onAdd"), true));
			//these 2 lines will be removed after old client will not be supported.
			this.own(aspect.after(Desktop.syncServer, "onEnableSyncForFavoritesComplete", lang.hitch(this, "_onChange"), true));
			this.own(aspect.after(Desktop.syncServer, "onDisableSyncForFavoritesComplete", lang.hitch(this, "_onChange"), true));

			this.own(aspect.after(Desktop.syncServer, "onEnableSyncForItemsComplete", lang.hitch(this, "_onChange"), true));
			this.own(aspect.after(Desktop.syncServer, "onDisableSyncForItemsComplete", lang.hitch(this, "_onChange"), true));
			this.own(aspect.after(Desktop.syncServer, "onEnableSyncForItemsComplete", lang.hitch(this, "_onAddItems"), true));
			this.own(aspect.after(Desktop, "onChange", lang.hitch(this, "_onChange"), true));
			this.own(aspect.after(Desktop, "onLogout", lang.hitch(this, "reset"), true));
 

		},


		/**
		 * Cleans up the widget.
		 */
		uninitialize: function() {
			this.inherited(arguments);
			this.reset();
		},

		/**
		 * Destroys the grid and its modules.
		 */
		reset: function() {
  
			if (this.grid) {
				this._clearGridConnections();
				this.store = null;
				this.grid.destroyRecursive();
				this.grid = null;
			}
			if (this._contentListModuleObjects) {
				for ( var i in this._contentListModuleObjects) {
					if (this._contentListModuleObjects[i].destroy) {
						this._contentListModuleObjects[i].destroy();
					}
				}
				this._contentListModuleObjects = {};
			}
			this._isGlobalModulesLoaded = false;
			this._resultSet = null;
			this._viewCurrentName = null;
			this._clearResultSetConnections();
		},

		/**
		 * Set the list of grid extension modules to load when the grid is created.
		 * 
		 * @param modules
		 *            List of modules to extend the internal grid object.
		 */
		setGridExtensionModules: function(modules) {
			this._gridExtensionModules = modules;
		},

		/**
		 * Returns the list of grid extension modules.
		 * 
		 * @return modules List of modules added to this content list.
		 * @since 2.0.2
		 */
		getGridExtensionModules: function(modules) {
			return this._gridExtensionModules;
		},

		/**
		 * Returns the list of contentList modules
		 * 
		 * @return modules List of modules added to this content list.
		 * @since 2.0.2
		 */
		getContentListModules: function(modules) {
			return this._contentListModules;
		},

		/**
		 * Set the list of contentList modules to load the first time the result set is set.
		 * 
		 * @param modules
		 *            List of modules to extend the content list.
		 */
		setContentListModules: function(modules) {
			this._contentListModules = modules;
		},

		/**
		 * Sets the model for this content list.
		 * 
		 * @param model
		 *            An instance of {@link ecm.model.ResultSet}
		 * @param listParent
		 *            A parent folder or search of the parent content list
		 */
		setResultSet: function(resultSet, listParent) {
  
					  
   
								  
			this.onBeforeSetResultSet(resultSet);
			this._resultSet = resultSet;
								 
								   
									 
			this.onSetResultSet(listParent);
			if (!this._isContentListModulesLoaded()) {
				//this.logDebug("setResultSet", "display item editor: false");
				this._showItemPropArea(false); // hiding the item prop area - if a module uses this area, then it should show the area
				this._loadContentListModules();
				if (this.itemPropArea && this.itemPropArea._splitterWidget){
					//before collapse the doc info pane, check if it is already opened before logout, if it is, connect to trigger the click open action
					if( this.itemPropArea._isOpen && this.getContentListModule("rightPane") && this.getContentListModule("rightPane").selectAutoOpen ){
						var t = this.getContentListModule("rightPane");
						if( !t._rowClickHandle ){
							t._rowClickHandle = t.connect(this, "onRowSelectionChange", lang.hitch(t, function(selectedItems) {
								if (selectedItems && selectedItems.length > 0) {
									t.setPaneWidth();//to fix defect 38636
									t.contentList.gridContainer.restore();
									t.contentList.itemPropArea._isInitialized = true;
									connect.disconnect(t._rowClickHandle);
								}
							}));
						}
					}
					this.itemPropArea._splitterWidget._collapse(300);
				}	

			}
			this._clearResultSetConnections();
			if (this._resultSet) {
   
				domClass.remove(this.gridContainer.domNode, "dijitHidden");
				this._setViews();
				this._createResultSetConnections();
				if (this.grid == null) {
					this._createGrid();
				} else {
	 
					// figure out why need to recreate grid as the Cache has the original data
					this._createGrid();
					//this.grid.setColumns(this._detailsView);
					//this.grid.setStore(this._resultSet.getStore());
					//this._createGridModuleConnections();
				}
			} else { // null resultSet
				domClass.add(this.gridContainer.domNode, "dijitHidden");
			}
						
	
		},
		/**
		 * Event fired after the result set is set. This allows content list modules to be notified when the result set
		 * is updated.
		 * 
		 * @param listParent
		 *            A parent folder or search of the parent content list
		 */
		onSetResultSet: function(listParent) {
		},

		/**
		 * Loads the content list modules.
		 * 
		 * @private
		 */
		_loadContentListModules: function() {
			this._contentListModuleObjects = {};
			for (var i = 0; i < this._contentListModules.length; i++) {
				var module = this._contentListModules[i];
				var m;
				if (module.moduleClass) {
					m = new module.moduleClass(this, module);
				} else {
					m = new module(this, {});
				}
				if (m.getAPIPath) {
					this._mixinAPI(this._contentListModuleObjects, m.getAPIPath());
				}
				m.preload();
			}
			this._isGlobalModulesLoaded = true;
			this.onContentListModulesLoaded();
		},

		/**
		 * Mixes in the content list module's getAPIPath into this widget.
		 * 
		 * @private
		 */
		_mixinAPI: function(base, apiPath) {
			if (apiPath) {
				for ( var path in apiPath) {
					var bp = base[path], ap = apiPath[path];
					//if (bp && lang.isObject(bp) && !lang.isFunction(bp)) {
					//this._mixinAPI(bp, ap);
					//} else {
					base[path] = ap;
					//}
				}
			}
		},

		/**
		 * Loads the content list modules.
		 * 
		 * @private
		 */
		_isContentListModulesLoaded: function() {
			return this._isGlobalModulesLoaded != undefined ? this._isGlobalModulesLoaded : false;
		},

		/**
		 * Sets the details & magazine views from the resultSet structures.
		 * 
		 * @private
		 */
		_setViews: function() {
			if (this._resultSet.structure) {
				var clone = lang.clone(this._resultSet.structure); // Note: the structure is cloned because the formatters are modified below
				this._detailsView = clone.cells ? clone.cells[0] : clone;
				if (this.escapeStructureName) {
					for (var i = 0; i < this._detailsView.length; i++) {
						var field = this._detailsView[i];
						if (field.name && field.name != '&nbsp;') {
							field.name = idxHtml.escapeHTML(field.name);
						}
					}
				}
			}

			if (this._resultSet.magazineStructure) {
				this._magazineView = lang.clone(this._resultSet.magazineStructure);
				for (var i = 0; i < this._magazineView.length; i++) {
					var field = this._magazineView[i];
					if (this.escapeStructureName) {
						if (field.name && field.name != '&nbsp;') {
							field.name = idxHtml.escapeHTML(field.name);
						}
					}
					if (field.extraFieldsToDisplay) {
						this._hitchViewDecorators(field.extraFieldsToDisplay);
					}
					if (field.fieldsToDisplay) {
						this._hitchViewDecorators(field.fieldsToDisplay);
					}
				}
			}

			this.onSetViews();
		},

		/**
		 * Event fired after the views have been reset by the resultSet.
		 */
		onSetViews: function() {
   
		},

		/**
		 * Event fired before setting the resultSet. Allows the user to update the resultSet before setting it in the
		 * content list.
		 * 
		 * @param model
		 *            An instance of {@link ecm.model.ResultSet}
		 */
		onBeforeSetResultSet: function(resultSet) {
  
		},

		/**
		 * Append to the result set.
		 * 
		 * @param model
		 *            An instance of {@link ecm.model.ResultSet}
		 */
		appendResultSet: function(resultSet) {

			if (resultSet && this._resultSet) {
				this._resultSet.append(resultSet);
								   
			} else if (resultSet) {
				this.setResultSet(resultSet);
			}
  
		},

		/**
		 * Returns the result set associated with this content list.
		 * 
		 * @return Returns an instance of {@link ecm.model.ResultSet}
		 */
		getResultSet: function() {
			return this._resultSet;
		},

		/**
		 * Creates the grid for this content list.
		 * 
		 * @private
		 */
		_createGrid: function() {
			if (this._resultSet != null) {
				var structure = this._getGridStructure();
				this._setEditorArguments(structure);
				// Clear grid connections and destroy grid
				if (this.grid) {
					this._clearGridConnections();
					this.grid.destroyRecursive();
				}

				if (this._detailsView)
					this._addDetailsViewColumnDecorators();
				if (this._magazineView)
					this._addMagazineViewColumnDecorators();

				// Destroying the grid does not free the store; must take
				// care of that manually.
				if (this.store)
					this.store = null;
				this.store = this._resultSet.getStore();
				var store=this.store;
				var that=this;
//				context.hide=that.hide;
				that.store.refresh=function()
				{

					for(var i in that._resultSet.items)
					{
					if(that._resultSet.items[i].children)
						that._resultSet.items[i].children=false;
					}
					that.refreshItems();
					that._createGrid();
				};
					
				that.store.hasChildren = function(id, item){
						console.log(id);
						console.log(item);	
						if(item.isFolder()){
							return true;
						}	
			
						
	       };
				that.store.getChildren = function(item){		
				if(!item.children)
						{
					item.getChildren=true;
					var params = {};
					params.pageSize=200;
					params.depth=1;
					params.foldersOnly=false;
					context.Children = new Deferred();
	
					    	that.retrieveAllItemsAndSubFolders(item,function (resultSet){
								var children=resultSet[0].resultSet.items;
								context.Children.callback(children);
							},params);
					    return context.Children;
						}else
						{
						return item.children;						
						}
	 
		};
				
				this.grid = new Grid({
								
					cacheClass: Cache,
					pageSize: this._resultSet.pageSize,
					store: this.store,
					indirectSelect : true,
					selectRowTriggerOnCell: true,	   
								   
					structure: structure,
					//selectRowTriggerOnCell: !has("ecmMobile"),
					modules: this._getModules(),
					textDir: has("text-direction"),
					headerHidden: this.headerHidden,
					frmPage:'FolderTreeGrid'
				});
				if (this.grid.rowCount() > 0) {
					this.grid.vScrollerBuffSize = 0;		// row count nodes above/below the grid body viewport
				}
				this.grid.body._loadFail = lang.hitch(this, function(e) {
				});
   
	
				this.grid.contentList = this;
				this._grid = this.grid;
				this._createGridConnections();

				this.grid.model.clearCache();
				this.grid.body.refresh();
				
				domConstruct.place(this.grid.domNode, this.gridArea.domNode, "only");
				
				// Display the number of selected items in list
				if (this._allowCheckboxes) {
					domStyle.set(this.belowGridArea.domNode, "display", "");
					this.belowGridNotificationText.innerHTML = string.substitute(this.messages.num_items_selected, [this.grid.select.row.getSelected().length]);
				}
				
																		 
				this.grid.startup();
				this.grid.model.clearCache();
				this.grid.body.refresh();
			}
   
		},
  
		/**
		 * Get the current view's structure. If no current view, then use detailsView. If no detailsView, use
		 * magazineView.
		 * 
		 * @private
		 */
		_getGridStructure: function() {

			var structure = this._detailsView ? this._detailsView : this._magazineView;
			var currentViewModule = this._getCurrentViewModule();
			if (currentViewModule && currentViewModule._getStructure()) {
				structure = currentViewModule._getStructure();
			}
			return structure;
		},

		_setEditorArguments: function(structure) {
			try {
				array.forEach(structure, lang.hitch(this, function(col) {
					if (!col.editor)
						return;

					if (col.customApplyEdit && !lang.isFunction(col.customApplyEdit)) {
						var theFunction = this._getFunction(col.customApplyEdit, "editors");
						if (theFunction) {
							col.customApplyEdit = lang.hitch(this, theFunction);
						}
					}
					if (col.editorArgs && col.editorArgs.toEditor && !lang.isFunction(col.editorArgs.toEditor)) {
						var theFunction = this._getFunction(col.editorArgs.toEditor, "editors");
						if (theFunction) {
							col.editorArgs.toEditor = lang.hitch(this, theFunction);
						}
					}
					if (col.editorArgs && col.editorArgs.fromEditor && !lang.isFunction(col.editorArgs.fromEditor)) {
						var theFunction = this._getFunction(col.editorArgs.fromEditor, "editors");
						if (theFunction) {
							col.editorArgs.fromEditor = lang.hitch(this, theFunction);
						}
					}

					require([
						col.editor.replace(/\./g, "/")
					], function(editor) {
						if (!col.customApplyEdit && lang.isFunction(editor.customApplyEdit))
							col.customApplyEdit = editor.customApplyEdit;
						if (!col.editorArgs || !col.editorArgs.toEditor && lang.isFunction(editor.toEditor) || !col.editorArgs.fromEditor && lang.isFunction(editor.fromEditor)) {
							if (!col.editorArgs) {
								col.editorArgs = {};
							}
							if (!col.editorArgs.toEditor && lang.isFunction(editor.toEditor)) {
								col.editorArgs.toEditor = editor.toEditor;
							}
							if (!col.editorArgs.fromEditor && lang.isFunction(editor.fromEditor)) {
								col.editorArgs.fromEditor = editor.fromEditor;
							}
						}
					});
				}));
			} catch (e) {
				this.logDebug("_setEditorArguments", "Failed to set editor arguments: " + e.message, e);
			}
		},

		/**
		 * Modules can hide or show the right pane (item prop area)
		 * 
		 * @private
		 */
		_showItemPropArea: function(bool) {
  
			var dir = this.isLeftToRight() ? "right" : "left";
			var splitter = this.itemPropArea._splitterWidget;
			if (splitter) {
				//this.logDebug("_showItemPropArea", "display item editor: " + bool);
				domStyle.set(splitter.domNode, "display", bool ? "" : "none");
			}
		},

		/**
		 * Event fired when a view button is clicked.
		 * 
		 * @param buttonViewName
		 *            Name of the view button clicked.
		 * @param currentViewName
		 *            Name of the current view button.
		 */
		onViewButtonClicked: function(buttonViewName, currentViewName) {
		},

		/**
		 * Event fired when all the grid modules are loaded.
		 */
		onModulesLoaded: function() {
   
			this.resize();
			if (this.selectFirstRowOnSetResult && this._resultSet.items.length > 0) {
				setTimeout(lang.hitch(this, function() {
					if (this.multiSelect) {
						this.grid.select.row.selectByIndex(0);
					} else {
						var id = this.grid.model.indexToId(0);
						this.grid.select.row.selectById(id);
					}
				}, 0));
			} else {
				this.onRowSelectionChange([]);
			}
		},

		/**
		 * Event fired when all the content list grid modules are loaded.
		 * 
		 * @since 2.0.3
		 */
		onContentListModulesLoaded: function() {
		},

		/**
		 * Returns the specified grid module.
		 * 
		 * @return Instance of {@link gridx.core._Module}.
		 */
		getGridModule: function(name) {
			return this.grid ? this.grid[name] : null;
		},

		/**
		 * Returns the specified content list module.
		 * 
		 * @return Instance of {@link ecm.widget.listView.modules._Module}.
		 */
		getContentListModule: function(name) {
			var module = this._contentListModuleObjects ? this._contentListModuleObjects[name] : null;
			if (module) {
				return module;
			} else {
				for ( var i in this._contentListModuleObjects) {
					var contentListModuleObject = this._contentListModuleObjects[i];
					if (contentListModuleObject && contentListModuleObject.getContentListModule) {
						module = contentListModuleObject.getContentListModule(name);
						if (module) {
							return module;
						}
					}
				}
			}
			return module;
		},

		/**
		 * Get sort column id.
		 * 
		 * @private
		 */
		_getSortColumnId: function() {
  
			return !this._resultSet || this._resultSet.sortIndex < 0 ? 3 : this._resultSet.sortIndex;
  
		},

		/**
		 * Is sort direction descending.
		 * 
		 * @private
		 */
		_isSortDirectionDescending: function() {
  
			var descending = false;
			if (this._resultSet && this._resultSet.sortDirection != undefined) {
				descending = this._resultSet.sortDirection == -1 ? true : false;
			}
			return descending;
		},

		/**
		 * Get the grid modules.
		 * 
		 * @private
		 */
		_getModules: function() {
			var gridModules = [];
			for ( var i in this.coreModules) {
				gridModules.push(this.coreModules[i]);
			}
			if (this.multiSelect) {
				gridModules.push(SelectRow);
				gridModules.push(ExtendedSelectRow);
				// checkboxes for rows selection
				/*if (this._allowCheckboxes) {
					gridModules.push(IndirectSelectColumn);		
					require([
				        "ecm/widget/listView/gridModules/_Dnd"
					], function(cls) {
						gridModules.push(cls);
					});
				}*/
			} else {
				gridModules.push({
					moduleClass: SelectRow,
					multiple: false,
					triggerOnCell: !has("ecmMobile")
				});
			}
			if (this.emptyMessage && this.emptyMessage != "") {
				gridModules.push({
					moduleClass: Body,
					emptyInfo: this.emptyMessage
				});
			} else {
				gridModules.push(Body);
			}
			for ( var i in this._gridExtensionModules) {
				gridModules.push(this._gridExtensionModules[i]);
			}
			// Add the single sort with the model's specified sortIndex & sortDirection
 
			if ((this._resultSet.sortIndex != undefined && this._resultSet.sortIndex != -1) || this._resultSet.searchTemplate) { // search results may not be sorted initially but can be sorted after
  
			}
			return gridModules;
		},

		/**
		 * Returns the current view module (i.e. ViewDetail, ViewMagazine)
		 * 
		 * @private
		 */
		_getCurrentViewModule: function() {
			if (this._viewCurrentName) {
				return this.getContentListModule(this._viewCurrentName);
			} else {
				return null;
			}
		},

		/**
		 * Connects events to handle row selection and double click events on the Grid.
		 * 
		 * @private
		 */
		_createGridConnections: function() {
   
			if (!this.gridConnections)
				this.gridConnections = [];

			/* 
			// Uncommenting this code prevents the ability of swipping cell data (for copying / pasting cell data).
			this.gridConnections.push(on(this.grid.domNode, "mousedown", function(e) {
				e.preventDefault();
				e.stopPropagation();
			})); */

			this.gridConnections.push(aspect.after(this.grid.body, "onRender", lang.hitch(this, "onRender"), true));
			this.gridConnections.push(aspect.after(this.grid.body, "onEmpty", lang.hitch(this, "onEmpty")));
			this.gridConnections.push(aspect.after(this.grid, "resize", lang.hitch(this, "onGridResize"), true));
			this.gridConnections.push(aspect.after(this.grid, "onModulesLoaded", lang.hitch(this, "onModulesLoaded"), true));
			this.gridConnections.push(aspect.after(this.grid, "onRowDblClick", lang.hitch(this, function(evt) {
				this.onRowDblClick(this.grid.row(evt.rowIndex).item(), evt);
				event.stop(evt);
			}), true));
			this.gridConnections.push(aspect.after(this.grid, "onRowClick", lang.hitch(this, function(evt) {
				this.onRowClick(this.grid.row(evt.rowIndex).item(), evt);
				event.stop(evt);
			}), true));
   
			this.gridConnections.push(aspect.after(this.grid.domNode, "onkeydown", lang.hitch(this, "_onKeyDown"), true));
			this.gridConnections.push(aspect.after(this.grid.domNode, "onkeyup", lang.hitch(this, "_onKeyUp"), true));

			this.gridConnections.push(aspect.after(this.grid.select.row, "onSelectionChange", lang.hitch(this, function(selected) { // enhanced row select module calls this
				// Broadcast the selection change only if there are no items queued to be re-selected, e.g., when a selected item
				// is updated with a new ID, the list is updated with the "new" item and the item is re-selected to restore state
				// and trigger a selection change that is broadcasted
				if (!this._idsToSelect || !this._idsToSelect.length) {
					this.onRowSelectionChange(this._getItems(selected));	
				}
				// Display the number of selected items in list at the bottom of the grid
				if (this._allowCheckboxes) {
					this.belowGridNotificationText.innerHTML = string.substitute(this.messages.num_items_selected, [this.grid.select.row.getSelected().length]);	
				}

			}), true));
			this.gridConnections.push(aspect.after(this.grid.select.row, "onSelected", lang.hitch(this, function(selected) { // row select module (used for single select) calls this
				if (selected) {
					this.onRowSelectionChange([
						selected.item()
					]);
				}
			}), true));
			this.gridConnections.push(aspect.after(this.grid.body, "collectCellWrapper", lang.hitch(this, "_createCellWrapper"), true));
		},

		/**
		 * Removes all Grid connections.
		 * 
		 * @private
		 */
		_clearGridConnections: function() {
			if (this.gridConnections && this.gridConnections.length > 0) {
				array.forEach(this.gridConnections, this.disconnect, this);
											  
	 
			}
			this.gridConnections = [];
		},

		/**
		 * Removes all result set connections.
		 * 
		 * @private
		 */
		_clearResultSetConnections: function() {
			if (this._resultSetConnections && this._resultSetConnections.length > 0) {
				array.forEach(this._resultSetConnections, this.disconnect, this);
													
	 
			}
			this._resultSetConnections = [];
		},

		/**
		 * Create the result set connections.
		 * 
		 * @private
		 */
		_createResultSetConnections: function() {
			if (this._resultSet) {
				this._resultSetConnections = [];
				this._resultSetConnections.push(aspect.after(this._resultSet, "onChange", lang.hitch(this, "_onChangeResultSet"), true));
				this._resultSetConnections.push(aspect.after(this._resultSet, "onServerSort", lang.hitch(this, "_onServerSortResultSet"), true));
				this._resultSetConnections.push(aspect.after(this._resultSet, "onNextPageRetrieved", lang.hitch(this, "_onNextPageRetrievedResultSet"), true));
			}
		},

		/**
		 * Create a wrapper on the cell. Supports styles on the column structure.
		 * 
		 * @private
		 */
		_createCellWrapper: function(wrappers, rowId, colId) {
			var col = this.grid._columnsById[colId];
			if (col.styles) {
				wrappers.push({
					priority: 0,
					wrap: function(cellData) {
						return [
							"<div style='width:100%;height:100%;",
							col.styles,
							"'>",
							cellData,
							"</div>"
						].join('');
					}
				});
			}
		},

		/**
		 * Add decorators to the detail view columns.
		 * 
		 * @private
		 */
		_addDetailsViewColumnDecorators: function() {
			this._hitchViewDecorators(this._detailsView);
			this._hitchEscapeHtmlDecorators(this._detailsView);
		},

		/**
		 * Add decorators to the magazine view columns.
		 * 
		 * @private
		 */
		_addMagazineViewColumnDecorators: function() {
			this._hitchViewDecorators(this._magazineView);
			this._hitchEscapeHtmlDecorators(this._magazineView);
		},

		/**
		 * Any cell without a decorator, add the html escape decorator so all string data is shown as-is.
		 * 
		 * @param view
		 *            Structure array containing column definitions to modify.
		 * @private
		 */
		_hitchEscapeHtmlDecorators: function(view) {
			if (view) {
				for ( var i in view) {
					var cell = view[i];
					if (cell && cell.field == "multiStateIcon") {
						this._states = cell.states;
					}

					if (this.escapeCellData && cell && !cell.decorator) {
						cell.decorator = function(data, rowId) {
							if (data && lang.isString(data)) {
								return idxHtml.escapeHTML(data);
							} else {
								return data;
							}
						};
					}
				}
			}
		},

		/**
		 * Hitches all cell decorators to this ContentList object.
		 * 
		 * @param view
		 *            Structure array containing column definitions to modify.
		 * @private
		 */
		_hitchViewDecorators: function(view) {
			if (view) {
				for ( var i in view) {
					var cell = view[i];
					if (cell && cell.decorator) {
						if (lang.isFunction(cell.decorator)) {
							cell.decorator = lang.hitch(this, cell.decorator);
						} else {
							var theFunction = this._getFunction(cell.decorator, "decorators");
							if (theFunction) {
								cell.decorator = lang.hitch(this, theFunction);
							}
						}
					}
					if (cell && cell.setCellValue) {
						if (lang.isFunction(cell.setCellValue)) {
							cell.setCellValue = lang.hitch(this, cell.setCellValue);
						} else {
							var theFunction = this._getFunction(cell.setCellValue, "decorators");
							if (theFunction) {
								cell.setCellValue = lang.hitch(this, theFunction);
							}
						}
					}
					if (cell && cell.onCellWidgetCreated) {
						if (lang.isFunction(cell.onCellWidgetCreated)) {
							cell.onCellWidgetCreated = lang.hitch(this, cell.onCellWidgetCreated);
						} else {
							var theFunction = this._getFunction(cell.onCellWidgetCreated, "decorators");
							if (theFunction) {
								cell.onCellWidgetCreated = lang.hitch(this, theFunction);
							}
						}
					}
				}
			}
		},

		/**
		 * @private Return the function for the input name.
		 */
		_getFunction: function(name, subdir) {
			//return eval(name); 
			var theFunction = lang.getObject(name); // Get the plugin value (i.e. "samplePluginEmailDecorator")
			if (!theFunction) {
				var nameArray = name.split('.'); // Split the value (i.e. "DetailsViewDecorator.mimeTypeDecorator")
				if (nameArray.length > 0) {
					var array = this._thisDeclaredClass.split(".");
					array.pop(); // Remove "ContentList" from the array
					if (subdir) {
						array.push(subdir);
					}
					array.push(nameArray.shift());
					try {
						require([
							array.join("/")
						], lang.hitch(this, function(cls) {
							if (nameArray.length > 0) {
								theFunction = cls[nameArray.shift()];
							} else {
								theFunction = cls;
							}
						}));
					} catch (e) {
						console.error(name + " " + e.message);
					}
				}
			}
			return theFunction;
		},

		/**
		 * Returns the dropdown dialog. Used by the child component & reference attributes.
		 * 
		 * @private
		 */
		_getContentListDropDownDialog: function(callback) {
			if (!this._contentListDropDownDialog) {
				//this._contentListDropDownDialog = new ContentListDropDownDialog();
				var self = this;
				require([
			        "ecm/widget/ContentListDropDownDialog"
				], function(cls) {
					self._contentListDropDownDialog = new cls();
					if (callback) {
						callback(self._contentListDropDownDialog);
					}
				});
			} else {
				if (callback) {
					callback(this._contentListDropDownDialog);
				}
			}
										  
		},

		/**
		 * Shows the child component in the dropdown dialog.
		 * 
		 * @private
		 */
		_showChildComponentData: function(rowId, childComponentName, evt) {
			this._getContentListDropDownDialog(lang.hitch(this, function(dialog) {
				dialog.close();

				var item = this.grid.row(rowId).item();
				if (item.isInstanceOf && item.isInstanceOf(ecm.model.WorkItem)) {
					item = item.contentItem;
				}
				var x = evt.pageX;
				var y = evt.pageY;
				item.retrieveChildComponent(childComponentName, lang.hitch(this, function(childComponentItem) {
					if (childComponentItem) {
						var self = this;
						require([
						    "ecm/widget/ChildComponentSelector"
					    ], function(cls) {
							var childComponentSelector = new cls({
								borderHeight: "220px",
								columnsResizable: false,
								childComponentItem: childComponentItem
							});
							childComponentSelector.startup();
							dialog.setRootPane(item, childComponentSelector);
							dialog.show({
								position: {
									x: x,
									y: y
								}
							});
						});
					}
				}));
			}));
		},

		/**
		 * Shows the reference attribute data in the dropdown dialog.
		 * 
		 * @param rowId
		 *            ID of the grid row containing the {@link ecm.model.Item} object.
		 * @param referenceAttributePID
		 *            ID of the referenced item.
		 * @param evt
		 *            Handle to the click event that initiated the action.
		 * @private
		 */
		_showReferenceAttributeData: function(rowId, referenceAttributePID, evt) {
			this._getContentListDropDownDialog(lang.hitch(this, function(dialog) {
				dialog.close();
				var x = evt.pageX;
				var y = evt.pageY;
				var item = this.grid.row(rowId).item();
				dialog.setItem(item.repository, referenceAttributePID, function() {
					dialog.show({
						position: {
							x: x,
							y: y
						}
					});
				});
			}));
		},

		/**
		 * When a server sort is performed, update the content list's result set with the new result set.
		 * 
		 * @private
		 */
		_onServerSortResultSet: function(oldResultSet, newResultSet) {
			if (oldResultSet == this._resultSet) {
				this._resultSet = newResultSet;
				this._idsToSelect = this.grid.select.row.getSelected();
 // When the grid.body onRender, then these ids will be re-selected.
				this._createResultSetConnections();
			}
		},

		/**
		 * When the result set changes, reload the grid with the new data.
		 * 
		 * @param object
		 *            Handle to the altered {@link ecm.model.ResultSet} object.
		 * @private
		 */
		_onChangeResultSet: function(object) {
   
						
			if (object == this._resultSet) {
	
				this._resultSet.sortIndex = object.sortIndex; // Use the original sort data
				this._resultSet.sortDirection = object.sortDirection;

				this._resultSet._structure = this._resultSet.structure; // Get the updated structures - the columns may have changed when we refreshed
				this._resultSet._magazineStructure = this._resultSet.magazineStructure;
				this._setViews();

				this._createGrid();
	
			}
   
		},

		_onNextPageRetrievedResultSet: function(object) {
			if (object == this._resultSet) {
				if (!object.continuationData) {
					for ( var colId in this.grid._columnsById) {
						var column = this.grid._columnsById[colId];
						if (column.sortableIfAll && !column.sortable) {
							column.sortable = true;
							this.grid.sort._initHeader(colId);
						}
					}
					array.forEach(this._detailsView, function(column) {
						if (column.sortableIfAll)
							column.sortable = true;
					});
				}
			}
		},

		/**
		 * When an array of data changes, then check if any of the items are in the grid. If in the grid, then notifiy
		 * the grid about the change.
		 * 
		 * @param modelObject
		 *            Handle to the {@ecm.model._ModelObject} that changed.
		 * @private
		 */
		_onChange: function(modelObject) {
   
			if (this.grid && lang.isArray(modelObject)) {
				array.forEach(modelObject, function(changedModel, i) {
					if (changedModel && changedModel.isInstanceOf && (changedModel.isInstanceOf(ecm.model.Item) || changedModel.isInstanceOf(ecm.model.Favorite) || changedModel.isInstanceOf(ecm.model.Teamspace))) {
						var resultSet = this.getResultSet();
						if (changedModel.deleted //
								&& !(resultSet && resultSet.id == '__favorites' && changedModel.declaredClass == 'ecm.model.SyncItem')//
								&& !(resultSet && resultSet.setType == 'teamspace' && changedModel.declaredClass == 'ecm.model.SyncItem')) {
							if (this.grid.store.deleteItem(changedModel)) {
								this.grid.select.row.clear();
							}

						} else {
							var id = this.grid.store.getIdentity(changedModel);
							var index = this.grid.model.idToIndex(id);
							var indexes = [];
							if (index == -1) {
								if (resultSet && resultSet.items && 
										((resultSet.declaredClass == "ecm.model.FavoritesResultSet" || resultSet.declaredClass == "ecm.model.MySyncedFilesResultSet")
										|| ( resultSet.grid_type == "workflow" && resultSet.items[0] && resultSet.items[0].declaredClass == "ecm.model.WorkItem" ) ) ) {
									//check the vsId
									for (var i = 0; i < resultSet.items.length; i++) {
										if (resultSet.items[i].vsId && changedModel.vsId && resultSet.items[i].vsId == changedModel.vsId) {
											index = i;
											break;
										}
										if (  resultSet.items[0].repository && resultSet.items[0].repository._isCM() && resultSet.items[i].contentItem &&
												( ( resultSet.items[i].contentItem.id && changedModel.id && resultSet.items[i].contentItem.id == changedModel.id) 
												||( resultSet.items[i].contentItem.docid && changedModel.docid && resultSet.items[i].contentItem.docid == changedModel.docid) ) ) {
											index = i;
											indexes.push(i);
										}
									}
								}
							}
							if (index != undefined && index > -1) {
								var gridItem = this.grid.row(index).item();
								if (gridItem && gridItem.declaredClass == changedModel.declaredClass) { // make sure this is the correct item.  Teamspace & ContentItem can have the same id.
									this._updateItemInGrid(gridItem, changedModel);
								} else if (gridItem.isInstanceOf(ecm.model.Favorite) && !(changedModel instanceof ecm.model.Teamspace) && !(changedModel instanceof ecm.model.SyncItem) && !(changedModel instanceof ecm.model.Favorite)) {
									//including favorite + contentitem and syncItem+contentItem conditions 
									if (gridItem.isInstanceOf(ecm.model.SyncItem)) {
										gridItem.name = changedModel.name;
										gridItem.checkName(changedModel);
									}
									if (gridItem.item) {
										changedModel.thumbnail = gridItem.item.thumbnail;
										gridItem.item.update(changedModel, true);
									}
									this.grid.store.onSet(gridItem);
									var isSelected = this.grid.select.row.isSelected(this.grid.model.indexToId(index));
									if (isSelected) {
										this.onSelectedItemUpdateItem(this._getItems(this.grid.select.row.getSelected()));
									}
								} else if (gridItem && gridItem.declaredClass == "ecm.model.Favorite" && changedModel.declaredClass == "ecm.model.Teamspace") {
									if (gridItem.item) {
										gridItem.item = changedModel;
										this.grid.store.onSet(gridItem);

										var isSelected = this.grid.select.row.isSelected(this.grid.model.indexToId(index));
										if (isSelected) {
											this.onSelectedItemUpdateItem(this._getItems(this.grid.select.row.getSelected()));
										}
									}
								} else if (gridItem && gridItem.declaredClass == "ecm.model.SyncItem" && changedModel.declaredClass == "ecm.model.Teamspace") {
									if (!changedModel.syncEnabled) {
										//if the teamspace is made offline and disabled sync on server
										if (this.grid.store.deleteItem(gridItem)) {
											this.grid.select.row.clear();
										}

									} else {
										if (gridItem.item) {
											gridItem.item = changedModel;
											this.grid.store.onSet(gridItem);

											var isSelected = this.grid.select.row.isSelected(this.grid.model.indexToId(index));
											if (isSelected) {
												this.onSelectedItemUpdateItem(this._getItems(this.grid.select.row.getSelected()));
											}
										}
									}
								} else if (gridItem && gridItem.declaredClass == "ecm.model.Favorite" && changedModel.declaredClass == "ecm.model.SyncItem") {
									if (gridItem.item) {
										gridItem.item.syncEnabled = changedModel.syncEnabled;
										gridItem.syncEnabled = changedModel.syncEnabled;
										this.grid.store.onSet(gridItem);
										var isSelected = this.grid.select.row.isSelected(this.grid.model.indexToId(index));
										if (isSelected) {
											this.onSelectedItemUpdateItem(this._getItems(this.grid.select.row.getSelected()));
										}
									}
								} else if (gridItem && gridItem.declaredClass == "ecm.model.Teamspace" && changedModel.declaredClass == "ecm.model.SyncItem") {
									gridItem.syncEnabled = changedModel.syncEnabled;
									this.grid.store.onSet(gridItem);
									var isSelected = this.grid.select.row.isSelected(this.grid.model.indexToId(index));
									if (isSelected) {
										this.onSelectedItemUpdateItem(this._getItems(this.grid.select.row.getSelected()));
									}
								} else if ( gridItem && gridItem.declaredClass == "ecm.model.WorkItem" && changedModel.declaredClass == "ecm.model.ContentItem" ){
									//may have multiple indexes
									for( var k = 0; k < indexes.length; k ++ ){
										var workIndex = indexes[k];
										gridItem = this.grid.row(workIndex).item();
										gridItem.contentItem.update( changedModel, true );
										gridItem._updateFromContentItem( gridItem.contentItem );
										this.grid.store.onSet(gridItem);
										gridItem.origdocid = null;
										gridItem.originalId = null;
										var isSelected = this.grid.select.row.isSelected(this.grid.model.indexToId(workIndex));
										if (isSelected) {
											this.onSelectedItemUpdateItem(this._getItems(this.grid.select.row.getSelected()));
										}
									}
								}
							} else if (changedModel.originalId) {
								id = this.grid.store.getIdentityId ? this.grid.store.getIdentityId(changedModel.originalId) : changedModel.originalId;
								index = this.grid.model.idToIndex(id);
								if (index > -1) {
									// handle changing of item id (P8 checkin & CM change Class change the id of the item)
									var isSelected = this.grid.select.row.isSelected(this.grid.model.indexToId(index));
									if (isSelected) {
										var idToSelect = changedModel.id;
										this._idsToSelect = [
											idToSelect
										]; // When the grid.body onRender, then this id will be selected
										this.grid.select.row.clear();
									}
									  
									this._updateItemInGrid(this.grid.row(index).item(), changedModel);
									//this.getResultSet().refresh();
									//return;
								}
							}
						}
					}
					//handle async tasks
					else if (changedModel && changedModel.isInstanceOf(ecm.model.AsyncTask)) {
						if (changedModel.deleted) {
							this.grid.store.deleteItem(changedModel);
							this.grid.select.row.clear();
						} else {
							this.grid.store.onSet(changedModel);
						}
					}
				}, this);

			} else if (modelObject && modelObject.isInstanceOf && modelObject.isInstanceOf(ecm.model.ContentItem)) { // when add folder or doc, then this is called with the parent contentItem that the folder/doc was added to
				// If the resultSet parentFolder's id == the changed item's id, then need to refresh the resultSet to get the latest data
				if (!modelObject.deleted && this.getResultSet() && this.getResultSet().parentFolder) {
					var parentFolder = this.getResultSet().parentFolder;
					if (parentFolder.isInstanceOf && parentFolder.isInstanceOf(ecm.model.Favorite) && parentFolder.item) {
						parentFolder = parentFolder.item;
					}
					var search = modelObject.isInstanceOf && modelObject.isInstanceOf(_SearchTemplateBase);
					if (modelObject.declaredClass == parentFolder.declaredClass && modelObject.id == parentFolder.id && (!search || modelObject == parentFolder)) {
						this.getResultSet().refresh();
					}
				}

			} else if (modelObject && (modelObject.declaredClass == "ecm.model.WorkItem" || 
					modelObject.declaredClass == "ecm.model.Worklist" || modelObject.declaredClass == "ecm.model.ProcessInbasket")) { // when processing P8 and CM8 work Item
				// The function isInstanceOf() doesn't work correctly when the object is instantiated in a separate window
				if (this.getResultSet() && this.getResultSet().parentFolder) {
					var parentFolder = this.getResultSet().parentFolder;
					// If it is a worklist or process inbasket, then refresh that basket only
					if (parentFolder.id != modelObject.id && (modelObject.declaredClass == "ecm.model.Worklist" || modelObject.declaredClass == "ecm.model.ProcessInbasket")) {
						return;
					}
					if (parentFolder.isInstanceOf && parentFolder.isInstanceOf(ecm.model.ProcessInbasket)) {
						this.getResultSet().refresh();
					} else {
						// Refresh the worklists grid for CM8 work Item
						// In CM - the content resultset can have a Worklist as a parent or a workitem as a parent.  A workitem as a parentFolder is when the
						// user drills down the workitem (folder) in the root of the worklist
						if (parentFolder.isInstanceOf && (parentFolder.isInstanceOf(ecm.model.Worklist) || parentFolder.isInstanceOf(ecm.model.WorkItem))) {
							//the parentFolder maybe an actual folder.
							//when process workitem, need not to refresh folder
							this.getResultSet().refresh();
						}
					}
				}
			}
		},
		refreshItems :function()
		{
			
			this._createGrid();
		},
		/**
		 * Adds a new item to the list store.
		 * 
		 * @param item
		 *            The item to add to the store.
		 * @private
		 */
		_onAdd: function(item) {
   
			if (item && this.grid && this.grid.store) {
				this.grid.store.newItem(item);
			}
		},

		/**
		 * Adds new items to the list store.
		 * 
		 * @param items
		 *            The items to add to the store.
		 * @private
		 */
		_onAddItems: function(items) {
			if (items && this.grid && this.grid.store) {
				for ( var i in items) {
					this.grid.store.newItem(items[i]);
				}
			}
		},

		/**
		 * @private Notifies the grid to refresh the row. If the gridItem has an update method, call the update method
		 *          to update the grid item with the latest data.
		 */
		_updateItemInGrid: function(gridItem, changedModelItem) {
   
			if (gridItem && gridItem.update) {
				gridItem.update(changedModelItem, true);
				this.grid.store.onSet(gridItem);
				gridItem.origdocid = null;
				gridItem.originalId = null;
			} else {
				this.grid.store.onSet(changedModelItem);
				changedModelItem.originalId = null;
			}
			var id = this.grid.store.getIdentity(changedModelItem);
			var index = this.grid.model.idToIndex(id);

			// Need to fire event to let listners like the toolbar know about the updates to selected items.
   
			var isSelected = this.grid.select.row.isSelected(this.grid.model.indexToId(index));
			if (isSelected) {
				this.onSelectedItemUpdateItem(this._getItems(this.grid.select.row.getSelected()));
			}

		},

		/**
		 * If multiSelect is enabled for the grid, Ctrl A selects all rows.
		 * 
		 * @param evt
		 *            Handle to the key down event.
		 * @private
		 */
		_onKeyDown: function(evt) {
			if (evt.ctrlKey && evt.keyCode == 65 && this.multiSelect) { // Ctrl A
				event.stop(evt);
				this._selectAll(evt);
			}
		},
		
		_onKeyUp: function(evt) {
			if (evt.keyCode === 9) {
				var id = this.grid.select.row._lastSelectedIds;
				if(document.activeElement.className.indexOf("gridx")==-1){
					if(id && id.length != 0)
						for(var idInstance = 0; idInstance < id.length; idInstance++)
							this.grid.select.row.deselectById(id[idInstance]);
				}
				else{
					event.stop(evt);
					if (this.multiSelect) {
							this.grid.select.row.selectByIndex(0);
					} else {					
						this.grid.select.row.selectById(this.grid.model.indexToId(0));
					}	
					this._setFocusCell(evt);
				}
			}
		},
		
		//set focus on the first visible cell
		_setFocusCell:function(evt){
			var style = domStyle.getComputedStyle(this.grid.body._focusCell());
			if (style.display == "none" || style.visibility == "hidden"){
				for(var i=0; i < this.grid._columns.length; i++){
					style = domStyle.getComputedStyle(this.grid.body._focusCell(evt, 0, i));
					if (style.display == "none" || style.visibility == "hidden"){
						continue;
					}
					else
						break;
				}
			}
		},
		
		/**
		 * Selects all rows.
		 * 
		 * @private
		 */
		_selectAll: function(evt) {
   
			this.grid.select.row.clear();

			/*
			 compensate for the addition of null rows from _ModelStore#_fetchHandler
			 --> endIndexForGrid += 20; // fake more items

			 Note that giving an end-index greater than the current amount of rows will trigger a
			 fetch for more rows from the server, so we avoid that as well

			 These fake rows are null, so we filter them out, returning only valid indices to select
			 */
			var indices = array.map(this.grid.rows(), function (row) { return row ? row.index() : null; });

			this.grid.select.row.selectByIndex.apply(this.grid.select.row, indices);
		},

		/**
		 * Perform default action for the item at the specified row index. Used by the mime type decorator.
		 * 
		 * @param ID
		 *            of the grid row.
		 * @private
		 */
		_performDefaultActionForRowId: function(rowId) {
			var item = this.grid.row(rowId).item();
			if (this.grid.rowContextMenu && this.grid.rowContextMenu.performDefaultActionForItem) {
				this.grid.rowContextMenu.performDefaultActionForItem(item);
			} else {
				this.openItem(item);
			}
		},

		/**
		 * Opens the specified item.
		 * 
		 * @param item
		 *            Handle to the {@link ecm.model.Item} to open.
		 */
		openItem: function(item) {
   
			if (item) {
				var actionsHandler = ecm.model.desktop.getActionsHandler();
				if (actionsHandler) {
  
					actionsHandler.actionOpen(item, lang.hitch(this, function(item, openItemData) {
						if (openItemData && openItemData.isInstanceOf && (openItemData.isInstanceOf(ecm.model.ResultSet) || openItemData.isInstanceOf(ecm.model.FavoritesResultSet) || openItemData.isInstanceOf(ecm.model.MySyncedFilesResultSet))) {
							this.setResultSet(openItemData);
						}
						this.onOpenItem(item, openItemData);
					}), lang.hitch(this, function() {
						this.onOpenItem();
					}));
				}
			}
		},

		/**
		 * Navigate into a compound document.
		 * 
		 * @param item
		 *            Handle to the {@link ecm.model.Item} to navigate into. If the item is not a recognized compound
		 *            document, or the configured action handler does not contain actionViewChildDocuments, openItem is
		 *            called, and the default action for the item will be invoked.
		 * @since 2.0.3
		 */
		openCompoundDocument: function(item) {
			if (item) {
				var actionsHandler = ecm.model.desktop.getActionsHandler();
				if (actionsHandler && actionsHandler.actionViewChildDocuments) {
					actionsHandler.actionViewChildDocuments(item.repository, [
						item
					], null, null, item.resultSet, {
						widget: this
					});
				} else {
					this.openItem(item);
				}
			}
		},

		/**
		 * Event fired indicating an item (i.e. folder, teamspace) is opened or should be opened.
		 * 
		 * @param item
		 *            The {@link ecm.model.Item} opened.
		 * @param openItemData
		 *            Data associated with the action.
		 */
		onOpenItem: function(item, openItemData) {
   
		},

		/**
		 * Returns array of selected items.
		 * 
		 * @return Array of {@link ecm.model.Item} or {@link ecm.model.Favorite}.
		 */
		getSelectedItems: function() {
   
			return this.grid && this.grid.select ? this._getItems(this.grid.select.row.getSelected()) : [];
		},

		/**
		 * Returns array of items corresponding to the passed in row indexes.
		 * 
		 * @private
		 */
		_getItems: function(rowIndexs) {
   
			var items = [];
			if (lang.isArray(rowIndexs)) {
				for (var i = 0; i < rowIndexs.length; i++) {
					var row = this.grid.row(rowIndexs[i]);
					if (row) {
						items.push(row.item());
					}
				}
			} else {
				if (rowIndexs)
					items.push(this.grid.row(rowIndexs).item());
			}
			return items;
		},

		/**
		 * Event fired by grid body.
		 */
		onRender: function(start, count) {
   
			if (this._idsToSelect && this._idsToSelect.length > 0) {
				var selected = this._idsToSelect;
				if (selected && selected.length > 0) {
					// Clear any exiting selections before resetting _idsToSelect so that the onSelectionChange event is ignored
					this.grid.select.row.clear();
					
					// Reset _idsToSelect to allow broadcasting of the selection changes that follow
					this._idsToSelect = null;
					for (var i = 0; i < selected.length; i++) {
						var id = this.grid.store.getIdentityId ? this.grid.store.getIdentityId(selected[i]) : selected[i];
						this.grid.select.row.selectById(id);
					}
							  
				}
			}
		},

		onEmpty: function() {
		},

		/**
		 * Event fired by grid.
		 */
		onGridResize: function(start, count) {
  
   
		},

 
  
		/**
		 * Event fired when double click a row in the grid.
		 * 
		 * @param item
		 *            The {@link ecm.model.Item} or {@link ecm.model.Favorite} opened.
		 * @param evt
		 *            The mouse click event
		 */
		onRowDblClick: function(item, evt) {
		},

 
		/**
		 * Event fired when a row click occurs in the grid.
		 * 
		 * @param item
		 *            The {@link ecm.model.Item} or {@link ecm.model.Favorite} opened.
		 * @param evt
		 *            The mouse click event
		 * @since 2.0.2
		 */
		onRowClick: function(item, evt) {
		},

		/**
		 * Event fired when row selection in the grid changes.
		 * 
		 * @param selectedItems
		 *            Array of {@link ecm.model.Item} or {@link ecm.model.Favorite}.
		 */
		onRowSelectionChange: function(selectedItems) {


		},

		/**
		 * Event fired when a selected row is updated.
		 * 
		 * @param selectedItems
		 *            Array of {@link ecm.model.Item} or {@link ecm.model.Favorite}.
		 */
		onSelectedItemUpdateItem: function(selectedItems) {

		}
	});

	/**
	 * This static method calls the specified method on the widget matching the specified widget identifier.
	 * 
	 * @param widgetId
	 *            Identifier of the widget with the specified method
	 * @param method
	 *            The widget method to call.
	 * @memberof ecm.widget.listView.ContentList
	 */
	ContentList.callMethod = function(widgetId, method) {
		var widget = registry.byId(widgetId);
		if (widget && widget[method]) {
			var args = [];
			for (var i = 2; i < arguments.length; i++) {
				args.push(arguments[i]);
			}
			widget[method].apply(widget, args);
		}
	};

	return ContentList;
});
