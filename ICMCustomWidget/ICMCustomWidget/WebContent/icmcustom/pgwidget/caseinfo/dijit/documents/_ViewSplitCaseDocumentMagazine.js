define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/connect",
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/has",
	"dojox/html/entities",
	"ecm/widget/listView/decorators/common",
	"icm/widget/listView/modules/ViewMagazine"
], //
function(declare, lang, connect, domClass, domStyle, has, entities, common, ViewMagazine) {

	return declare(ViewMagazine, {

		name: 'viewSplitCaseDocumentMagazine',
		tooltip: "Case Doc view",
		iconName: "viewMagazine",
		widgetPaneId: null,
		
		getAPIPath: function() {
			return {
				viewSplitCaseDocumentMagazine: this
			};
		},		
		
		/**
		 * Structure for this view.
		 */
		_getStructure: function() {
            var checkboxAppended = false;
			var caseDocView = this.inherited(arguments);

            for(var i=0; i<caseDocView.length; i++){
                var view = caseDocView[i];
                if(view.field === "checkbox"){
                    checkboxAppended = true;
                }
            }

            if(!checkboxAppended){
                var boxid = "split_checkbox_" + this.widgetPaneId; //"split_checkbox_" + rowIndex;
                var checkboxCell = {
                    field: "checkbox",
                    name: "",
                    width: "17px",
                    decorator: lang.hitch(this, function(data, rowId, rowIndex) {
                        // show the checkbox in first column for documents
                        var item = this.contentList.grid.row(rowId).item();
                        var fieldsHTML;
                        if (item.mimetype === "folder") {
                            fieldsHTML = "&nbsp;" ;
                        } else {
							var attrTag = '';
 							if (item.isExternalDocument && !this.caseDoc.bExternalDocSupport()) 
								attrTag = ' disabled="disabled" ';
							else
							if (this.caseDoc.isSelectedForSplitCase && this.caseDoc.isSelectedForSplitCase(item)) {
								attrTag = ' checked ';
							}
                            fieldsHTML = '<input type="checkbox" id="' + boxid + //split_checkbox_' + 
                                + rowIndex + '" style="margin-top: 1px; margin-bottom: 1px;"' + attrTag + '/>';
                       }
                        return fieldsHTML;
                    })
                };
                caseDocView.unshift(checkboxCell);
            }

			return caseDocView;
		}
		
	});
});
