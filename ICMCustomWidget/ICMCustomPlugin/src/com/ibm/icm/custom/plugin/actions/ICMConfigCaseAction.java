package com.ibm.icm.custom.plugin.actions;

import java.io.IOException;
import java.util.Locale;

import com.ibm.ecm.extension.PluginAction;
import com.ibm.json.java.JSONObject;

public class ICMConfigCaseAction extends PluginAction {

	@Override
	public String getId() {
		return "custom.ICMConfigCaseAction";
	}

	@Override
	public String getName(Locale locale) {
		return "ICM Config Case Action";
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
		return "icmcustom.action.ICMConfigCaseAction";
	}

	@Override
	public JSONObject getAdditionalConfiguration(Locale locale) {
		String jsonString = 
			"{" +
			"\"ICM_ACTION_COMPATIBLE\": true," +
			"\"context\": null," +
			"\"name\": \"ICM Config Case\"," +
			"\"description\": \"An action to create/open a config case\"," +
			"\"properties\": [" +
				"{" +
					"\"id\": \"label\"," +
					"\"title\": \"label\"," +
					"\"defaultValue\": \"Config Case\"," +
					"\"type\": \"string\"," +
					"\"isLocalized\": false" +
				"}" +
			"]}";
		try {
			return JSONObject.parse(jsonString);
		} catch (IOException e) {
			e.printStackTrace();
		}
		return null;
	}
}
