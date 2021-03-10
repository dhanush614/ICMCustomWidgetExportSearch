package com.ibm.icm.custom.plugin.actions;

import java.io.IOException;
import java.util.Locale;

import com.ibm.ecm.extension.PluginAction;
import com.ibm.json.java.JSONObject;

public class ICMDownloadTemplate extends PluginAction {

	@Override
	public String getId() {
		return "custom.ICMDownloadTemplate";
	}

	@Override
	public String getName(Locale locale) {
		return "ICM Download Template";
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
		return true;
	}

	@Override
	public String getActionModelClass() {
		return "icmcustom.action.ICMDownloadTemplate";
	}

	@Override
	public JSONObject getAdditionalConfiguration(Locale locale) {
		String jsonString = "{\r\n" +
				"	        \"ICM_ACTION_COMPATIBLE\": true,\r\n" +
				"	        \"context\": null,\r\n" +
				"            \"name\": \"ICM Download Template\",\r\n" +
				"	    \"description\": \"An action to download documents\",\r\n" +
				"            \"properties\": [\r\n" +
				"                {\r\n" +
				"                    \"id\": \"label\",\r\n" +
				"                    \"title\": \"label\",\r\n" +
				"                    \"defaultValue\": \"Download Template\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"                {\r\n" +
				"                    \"id\": \"targetOS\",\r\n" +
				"                    \"title\": \"Enter Target OS\",\r\n" +
				"                    \"defaultValue\": \"\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"                {\r\n" +
				"                    \"id\": \"docClass\",\r\n" +
				"                    \"title\": \"Enter Document Class\",\r\n" +
				"                    \"defaultValue\": \"\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"            ],\r\n" +
				"            \"events\":[]" +
				"	}";
		try {
			return JSONObject.parse(jsonString);
		} catch (IOException e) {
			e.printStackTrace();
		}
		return null;
	}
}
