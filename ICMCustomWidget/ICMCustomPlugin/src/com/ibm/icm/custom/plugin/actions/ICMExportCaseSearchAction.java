package com.ibm.icm.custom.plugin.actions;

import java.io.IOException;
import java.util.Locale;

import com.ibm.ecm.extension.PluginAction;
import com.ibm.json.java.JSONObject;

public class ICMExportCaseSearchAction extends PluginAction {

	@Override
	public String getId() {
		return "custom.ICMExportCaseSearchAction";
	}

	@Override
	public String getName(Locale locale) {
		return "ICM Export Case Search Action";
	}

	@Override
	public String getIcon() {
		return "";
	}

	@Override
	public String getPrivilege() {
		return "";
	}

	@Override
	public String getServerTypes() {
		return "p8,cm";
	}

	@Override
	public String getActionFunction() {
		return "";
	}

	@Override
	public boolean isMultiDoc() {
		return false;
	}

	@Override
	public boolean isGlobal() {
		return false;
	}

	@Override
	public String getActionModelClass() {
		return "icmcustom.action.ICMExportCaseSearchAction";
	}

	@Override
	public JSONObject getAdditionalConfiguration(Locale locale) {
		String jsonString = "{\r\n" +
				"	         \"ICM_ACTION_COMPATIBLE\": true,\r\n" +
				"	         \"context\": null,\r\n" +
				"            \"name\": \"ICM Export Case Search Action\",\r\n" +
				"	    	 \"description\": \"An ICM action to export case search results\",\r\n" +
				"            \"properties\": [\r\n" +
				"                {\r\n" +
				"                    \"id\": \"label\",\r\n" +
				"                    \"title\": \"Label\",\r\n" +
				"                    \"defaultValue\": \"Export\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +			
				"				 {\r\n" +
				"                    \"id\": \"fileName\",\r\n" +
				"                    \"title\": \"File Name\",\r\n" +
				"                    \"defaultValue\": \"Export Case Search-\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"emptySearchMessage\",\r\n" +
				"                    \"title\": \"Message to be displayed if results are empty\",\r\n" +
				"                    \"defaultValue\": \"Case List is Empty ,Please Search with Valid Criteria.\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"            ],\r\n" +
				"            \"events\":[]" +
				"	}";	try {
			return JSONObject.parse(jsonString);
		} catch (IOException e) {
			e.printStackTrace();
		}
		return null;
	}
}
