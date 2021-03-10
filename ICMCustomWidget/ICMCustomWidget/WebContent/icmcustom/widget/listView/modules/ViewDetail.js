define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/dom-geometry",
	"dijit/Tooltip",
	"ecm/widget/listView/modules/_View",
	"dojo/_base/connect",
	"dojo/dom-construct",
	"dijit/form/ToggleButton",
	"ecm/model/Desktop"
], //
function(declare, lang, array, domClass, domStyle, domGeom, Tooltip, _View, connect, domConstruct, ToggleButton, Desktop) {

	/**
	 * @name ecm.widget.listView.modules.ViewDetail
	 * @class This content list module provides detail view capability.
	 * @augments ecm.widget.listView.modules._View
	 */

	return declare(_View, {
		/** @lends ecm.widget.listView.modules.ViewDetail.prototype */

		name: 'viewDetail',

		/**
		 * See GridX API documentation for details.
		 */
		getAPIPath: function() {
			return {
				viewDetail: this
			};
		},

		/**
		 * Creates the view button.
		 */
		preload: function() {
			var t = this, cl = t.contentList;
			t.initialize();
			t._viewButton = t._createViewButton("viewDetails", this.getCurrentViewName() == this.name, ecm.messages.detail_view_button_tooltip, ecm.messages.detail_view_button, false);
			if (t.showViewSelectorButton) {
				domConstruct.place(t._viewButton.domNode, t.getViewNode());
			}

			t.connect(cl, "onSetResultSet", lang.hitch(t, function() {
				t._viewSortData = null;
			}));
			t.connect(cl, "_onChangeResultSet", lang.hitch(t, function() {
				t._viewSortData = null;
			}));
		},

		/**
		 * Destroy.
		 */
		destroy: function() {
			var t = this;
			if (t._viewButton) {
				t._viewButton.destroyRecursive();
				t._viewButton = null;
			}
			t.inherited(arguments);
		},

		/**
		 * Return true if the view supports column sorting.
		 */
		supportsColumnSorting: function() {
			return true;
		},

		/**
		 * @private Called before changing the view to allow the detail view to save the sort data.
		 */
		_beforeChangeView: function() {
			var t = this, cl = t.contentList, g = cl.grid;
			// Save the column sort info - will put it back when the user goes back to the view.
			if (g && g.sort) {
				t._viewSortData = g.sort.getSortData();
			}
		},

		/**
		 * Handles a click event when any view button is clicked.
		 * 
		 * @param buttonViewName
		 *            Name of the view button clicked.
		 * @param currentViewName
		 *            Name of the current view button.
		 */
		onViewButtonClicked: function(buttonViewName, currentViewName) {
			var t = this, cl = t.contentList, g = cl.grid;
			if (g && buttonViewName == t.name && currentViewName != t.name) {
				// Reset the column sort info
				if (g.sort && t._viewSortData) {
					g.sort._sortId = t._viewSortData[0].colId;
					g.sort._sortDescend = t._viewSortData[0].descending;
				} else {
					// Initialize the column sort info
					var rs = cl.getResultSet();
					if (rs && rs.sortIndex != undefined && rs.sortIndex != -1) {
						g.sort._sortId = cl._getSortColumnId();
						g.sort._sortDescend = cl._isSortDirectionDescending();
					}
				}

				var structure = t._getStructure();
				t.setCurrentView(t.name, structure, t._viewButton);
				t._setShowPreview(true);

				g.setColumns(structure);
				cl.resize();

				var selectedItems = cl.getSelectedItems();
				if (selectedItems && selectedItems.length && selectedItems.length > 0) {
					var item = selectedItems[0];
					var id = g.store.getIdentity(item);
					var visualIndexToSelect = g.row(id).visualIndex();
					if (visualIndexToSelect > -1) {
						setTimeout(function() {
							try {
								g.vScroller.scrollToRow(visualIndexToSelect, true);
							} catch (e) {
								// ignore
							}
						}, 1000);
					}
				}
			} else if (buttonViewName != t.name) {
				t._viewButton.set("checked", false);
			} else {
				t._viewButton.set("checked", true);
			}
		},

		/**
		 * @private Structure for this view.
		 */
		_getStructure: function() {
			var t = this, cl = t.contentList;
			return cl._detailsView;
		}
	});
});
