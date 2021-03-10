package com.ibm.icm.custom.plugin.actions;

import java.io.IOException;
import java.util.Locale;

import com.ibm.ecm.extension.PluginAction;
import com.ibm.json.java.JSONObject;

public class ICMDispatchItemFromInbasket extends PluginAction {

	@Override
	public String getId() {
		return "custom.ICMDispatchItemFromInbasket";
	}

	@Override
	public String getName(Locale locale) {
		return "ICM DispatchItem From Inbasket";
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
		return true;
	}

	@Override
	public boolean isGlobal() {
		return false;
	}

	@Override
	public String getActionModelClass() {
		return "icmcustom.action.ICMDispatchItemFromInbasket";
	}

	@Override
	public JSONObject getAdditionalConfiguration(Locale locale) {
		String jsonString = "{\r\n" +
				"	        \"ICM_ACTION_COMPATIBLE\": true,\r\n" +
				"	        \"context\": null,\r\n" +
				"            \"name\": \"ICM Dispatch Item From Inbasket\",\r\n" +
				"	   		 \"description\": \"An action to dispatch workitem from inbasket\",\r\n" +
				"            \"properties\": [\r\n" +
				"                {\r\n" +
				"                    \"id\": \"label\",\r\n" +
				"                    \"title\": \"Label\",\r\n" +
				"                    \"defaultValue\": \"Dispatch Item From Inbasket\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"                {\r\n" +
				"                    \"id\": \"dispatchValueFlag\",\r\n" +
				"                    \"title\": \"Is Response needs to be auto populated?\",\r\n" +
				"                    \"defaultValue\": \"No\",\r\n" +
				"                    \"type\": \"choicelist\",\r\n" +
				"                    \"options\": [{\"id\": \"Yes\",\"title\": \"Yes\"},{\"id\": \"No\",\"title\": \"No\"}],\r\n"+				
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +	
				"                {\r\n" +
				"                    \"id\": \"responseValue\",\r\n" +
				"                    \"title\": \"Response Value\",\r\n" +
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
