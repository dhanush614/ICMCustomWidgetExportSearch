define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/connect",
	"dojo/dom-construct",
	"idx/html",
	"dojo/on",
	"dojo/sniff",
	"ecm/widget/listView/modules/ViewDetail"
], //
function(declare, lang, connect, domConstruct, idxHtml, on, sniff, ViewDetail) {

	return declare(ViewDetail, {

		name: 'viewCaseDocumentDetails',
		widgetPaneId: null,
		loop:0,
		getAPIPath: function() {
			return {
				viewCaseDocumentDetails: this
			};
		},

		/**
		 * @private Structure for this view.
		 */
		_getStructure: function() {
           	
			var t = this, cl = t.contentList;
			var columns = cl._detailsView;
			if(!columns)
				return columns;
							
			// Set the column structure
			var newColumns = [];
			
			for (var i = 0; i < columns.length; i ++) {/*
				// Remove the state, Size, and Major Version columns
				if (columns[i].field !== "ContentSize" && columns[i].field !== "MajorVersionNumber"
					&& columns[i].field !== "LastModifier" && columns[i].field !== "DateLastModified"	
				) {
					newColumns.push(columns[i]);
				}
			*/
				if (columns[i].field == "{NAME}")
			{
					newColumns.push(columns[i]);
					columns[i].expandField='childrens';
					columns[i].width='450px';
			}
				
			}

			
			if (sniff("ios")) {
				
                var nameColumn = null;
                for (var i = 0; i < newColumns.length; i++) {
                    if (newColumns[i].field === "{NAME}") {
                        nameColumn = newColumns[i];
                        break;
                    }
                }
                if (nameColumn) {
                	
                    nameColumn.widgetsInCell = true;
                    nameColumn.decorator = function () {
                        return "<div><a data-dojo-attach-point=\"nameLink\" class=\"docTitle\" href=\"javascript:;\" title=\"\"></a></div>";
                    };
                    nameColumn.setCellValue = lang.hitch(this, function (gridData, storeData, cellWidget) {
                    	
                        item = cellWidget.cell.row.item();
                        var normalizedName = idxHtml.escapeHTML(item.name);
                        var nameLink = cellWidget.nameLink;
                        nameLink.title = normalizedName;
                        nameLink.innerHTML = normalizedName;
                        if (nameLink._clickHandler) {
                            nameLink._clickHandler.remove();
                            nameLink._clickHandler = null;
                        }
                        var widgetPaneId = this.widgetPaneId;
                        var actionId = (item.mimetype === "folder") ? "icm.action.folder.Open" : "icm.action.document.Open";
                        nameLink._clickHandler = on(nameLink, "click", function () {
                     
                            if (sniff("ios")) {
                                cellWidget.cell.grid.select.row.clear();
                                cellWidget.cell.row.select();
                            }
                            icm.action.Action.perform(widgetPaneId, actionId);
                        });
                    });
                }
            } else {
            	var setCustomStyle = new Array();
                for (var i = 0; i < newColumns.length; i++) {
                    if (newColumns[i].field === "{NAME}") {
                        newColumns[i].decorator = lang.hitch(this, function (data, rowId, rowIndex) {
                  
                            var item = this.contentList.grid.row(rowId).item();
                            item.bgFlag='N';
        					setCustomStyle[item.id]=item;
                            var actionId;
                            
                            if (item.mimetype === "folder") {
                            	console.log('item.mimetype>>>>'+item.mimetype);
                            	 var fieldsHTML = "<div class=\"docTitle\" href=\"javascript:; \" onclick=\"" + "icm.action.Action.perform('" + this.widgetPaneId + "', '" + actionId + "');\" title=\"" + idxHtml.escapeHTML(item.name) + "\">" + idxHtml.escapeHTML(item.name)+"</div>";
                            } else {
                            	console.log('item.mimetype>>>>'+item.mimetype);                            	
                                actionId = "icm.action.document.Open";
                                //calling our custom method to open document in viewer
                                var bgColorCell = 'ecm.model.ContentItem['+item.id+']';
                                var fieldsHTML = '';
                                if(icmglobal.folderbgObject){
                                	if(icmglobal.folderbgObject[bgColorCell]){
                                	// background color change - user selection 
                                	 var object = icmglobal.folderbgObject[bgColorCell];
                                	 if(object.bgFlag == "N")
                                		 {
                                		 var tabContainer = this.tabContainer;
                                		 var bgColor="#FE5F55";
                                		 
										fieldsHTML = "<a class=\"docTitle\" href=\"javascript:;\" style=\"color:"+bgColor+"; \" onclick=\"" + "icm.action.Action.perform('" + this.widgetPaneId + "', '" + actionId + "');\" title=\"" + idxHtml.escapeHTML(item.name) + "\">" + idxHtml.escapeHTML(item.name)+"</a><br>";
                                		 }
                                	 else
                                		 {

                                     	// Normal text
                                     	fieldsHTML = "<a class=\"docTitle\" href=\"javascript:; \" onclick=\"" + "icm.action.Action.perform('" + this.widgetPaneId + "', '" + actionId + "');\" title=\"" + idxHtml.escapeHTML(item.name) + "\">" + idxHtml.escapeHTML(item.name)+"</a><br>";
                                		 }
                                	}
                                	else{
                                    	// Normal text
                                    	fieldsHTML = "<a class=\"docTitle\" href=\"javascript:; \" onclick=\"" + "icm.action.Action.perform('" + this.widgetPaneId + "', '" + actionId + "');\" title=\"" + idxHtml.escapeHTML(item.name) + "\">" + idxHtml.escapeHTML(item.name)+"</a><br>";
                                    }
                                		
                                }else{
                                	// Normal text
                                	fieldsHTML = "<a class=\"docTitle\" href=\"javascript:; \" onclick=\"" + "icm.action.Action.perform('" + this.widgetPaneId + "', '" + actionId + "');\" title=\"" + idxHtml.escapeHTML(item.name) + "\">" + idxHtml.escapeHTML(item.name)+"</a><br>";
                                }
                            }
                       
                            return fieldsHTML;
                        });
                        break;
                    }
                }
 			}
			
			// Set default sorting by name
			cl._resultSet.sortIndex  = 0;				
			
			return newColumns;
		}		
	});
});
