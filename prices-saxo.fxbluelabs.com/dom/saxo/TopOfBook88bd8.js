function OnLoad()
{
	ProcessQueryString();
	
	// Do any language translation on the headers
	if (document.UseLanguage) {
		SetLanguageStaticText("hdrInstrument", "Instrument");
		SetLanguageStaticText("hdrBid", "Bid");
		SetLanguageStaticText("hdrOffer", "Offer");
		SetLanguageStaticText("hdrSpread", "Spread");
	}

	try {
	// Put the lastRow style on the last visible row
	var tr = document.getElementById("tr" + (document.SymbolList.length - 1));
	if (tr) {
		var tds = tr.getElementsByTagName("TD");
		for (var i = 0; i < tds.length; i++) {
			AddClass(tds[i], "LastRow");
		}
	}

	// Hide any unused symbol rows, up to the maximum of 40
	for (var i = document.SymbolList.length; i < 40; i++) {
		var elemtr = document.getElementById("tr" + i);
		if (elemtr) elemtr.style.display = "none";
	}

	// Set the symbol names for things which we do have
	for (var i = 0; i < document.SymbolList.length; i++) {
		var elemtr = document.getElementById("tr" + i);
		if (elemtr) {
			var elemTD = elemtr.getElementsByTagName("TD")[0];
			if (elemTD) {
				elemTD.innerHTML = GetSymbolNameAndIcon(document.SymbolList[i]);	
			}
		}
	}
	} catch (ex) {}

	StartDataCollection();
	setInterval(ProcessClearMarkers, 100);
}


function GetLanguageValue(x)
{
	var elem = document.getElementById(document.UseLanguage + "-" + x);
	if (!elem) return null;
	return elem.innerHTML;
}

function SetLanguageStaticText(elemName, itemKey)
{
	var elem = document.getElementById(elemName);
	var txt = GetLanguageValue(itemKey);
	if (elem && txt) {
		elem.innerHTML = txt;
	}
}

function StartDataCollection()
{
	var strUrl = "../getpricesnapshot.aspx?id=" + document.StorageId + "&rawsym=" + document.SymbolList.join(",");
	if (document.LastDataTimestamp) strUrl += "&r=" + document.LastDataTimestamp;

	XMLTransmission("GET", strUrl, "", OnGotData);
}

function OnGotData(objXML)
{
	if (objXML) {
		if (objXML.responseText) {
			ParseData(objXML);
		}
		try {if (objXML.abort) {objXML.abort();}} catch (ex) {}
	}
	setTimeout(StartDataCollection, 500);
}

function ParseJSON(q)
{
	try {
		if (window.JSON) {
			if (q.indexOf("(") == 0) q = q.substr(1, q.length - 2);
			return JSON.parse(q);
		}
	} catch (ex) {}

	return eval(q);
}

function ParseData(objXML)
{
	try {
		var v = ParseJSON(objXML.responseText);
		if (!v) return;

		document.LastData = v;
		DisplayData();

	} catch (ex) {
	}
}

function DisplayData()
{
	var v = document.LastData;
	if (!v) return;

	// Symbols are guaranteed to be in requested order
	for (var i = 0; i < v.symbols.length; i++) {
		var pdata = v.symbols[i];

		var tr = document.getElementById("tr" + i);
		var tds = tr.getElementsByTagName("TD");

		if (pdata.bestBid && pdata.bestAsk) {

			SetInnerHtml(tds[1], FormatPrice(pdata.bestBid, document.SymbolList[i]));
			SetInnerHtml(tds[2], FormatPrice(pdata.bestAsk, document.SymbolList[i]));
			SetInnerHtml(tds[3], FormatPips(pdata.bestAsk - pdata.bestBid, document.SymbolList[i]));

			// Handle changes
			var prevBid = tds[1].getAttribute("prevBid");
			if (prevBid) {
				if (pdata.bestBid > prevBid) {
					AddClass(tds[1], "PriceRise");
					RemoveClass(tds[1], "PriceFall");

					CreateClearMarker("clearBid" + document.SymbolList[i], tds[1]);

				} else if (pdata.bestBid < prevBid) {
					RemoveClass(tds[1], "PriceRise");
					AddClass(tds[1], "PriceFall");

					CreateClearMarker("clearBid" + document.SymbolList[i], tds[1]);
				}
			}	
			tds[1].setAttribute("prevBid", pdata.bestBid);

			var prevAsk = tds[2].getAttribute("prevAsk");
			if (prevAsk) {
				if (pdata.bestAsk > prevAsk) {
					AddClass(tds[2], "PriceRise");
					RemoveClass(tds[2], "PriceFall");

					CreateClearMarker("clearAsk" + document.SymbolList[i], tds[2]);

				} else if (pdata.bestAsk < prevAsk) {
					RemoveClass(tds[2], "PriceRise");
					AddClass(tds[2], "PriceFall");

					CreateClearMarker("clearAsk" + document.SymbolList[i], tds[2]);
				}
			}	
			tds[2].setAttribute("prevAsk", pdata.bestAsk);

		} else {
			var txtClosed = GetLanguageValue("Closed");
			if (!txtClosed) txtClosed = "CLOSED";
			SetInnerHtml(tds[1], "<span class='Closed'><span>" + txtClosed + "</span></span>");
			SetInnerHtml(tds[2], "<span class='Closed'><span>" + txtClosed + "</span></span>");
			SetInnerHtml(tds[3], "-");

		}
	}		
}

function CreateClearMarker(key, elem)
{
	elem.lastChange = (new Date()).valueOf();
}

function ProcessClearMarkers()
{
	var now = (new Date()).valueOf();

	var arrE = document.getElementsByTagName("TD");
	for (var i = 0; i < arrE.length; i++) {
		var elem = arrE[i];
		if (elem.lastChange) {
			if (now - elem.lastChange >= 1000) {
				elem.lastChange = null;
				RemoveClass(elem, "PriceRise");
				RemoveClass(elem, "PriceFall");
			}
		}
	}
}


function FormatPrice(x, strSym)
{
	try {
		var strX;
		var bUseDecipip = true;

		var decimals;
		if (strSym.indexOf(".I") > 0) {
			decimals = 2;
			bUseDecipip = false;
		} else if (strSym.indexOf("OIL") == 0) {
			decimals = 2;
			bUseDecipip = false;
		} else if (strSym.indexOf("JPY") >= 0 || strSym.indexOf("HUF") >= 0 || strSym.indexOf("XA") >= 0) {
			decimals = 3;
		} else {
			decimals = 5;
		}

		// Introduce comma separator in thousands
		strX = NumberWithCommas(x.toFixed(decimals));

		var strMain = strX.substr(0, strX.length - 1);
		var strSub = strX.substr(strX.length - 1);

		if (bUseDecipip) {
			return "<span class='Price'><span class='PriceMain'>" + strMain + "</span><span class='PriceSub'>" + strSub + "</span></span>";
		} else {
			return "<span class='Price'><span class='PriceMain'>" + strMain + strSub + "</span></span>";
		}
	} catch (ex) {
	}
}

function FormatPips(x, strSym)
{
	if (strSym.indexOf(".I") > 0) {
		return x.toFixed(1);
	} else if (strSym.indexOf("OIL") == 0) {
		return (x * 100).toFixed(1);
	} else if (strSym.indexOf("JPY") >= 0 || strSym.indexOf("HUF") >= 0 || strSym.indexOf("XA") >= 0) {
		return (x * 100).toFixed(1);
	} else if (strSym.indexOf("CZK") >= 0) {
		return (x * 1000).toFixed(1);
	} else {
		return (x * 10000).toFixed(1);
	}
}

function NumberWithCommas(x) 
{
    var parts = x.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

function SetInnerText(elem, text)
{
	if (elem.innerText) {
		if (elem.innerText != text) {
			elem.innerText = text;
		}
	} else {
		if (elem.innerHTML != text) {
			elem.innerHTML = text;
		}
	}
}

// Function for creating an XMLHTTP object on different browsers.
function CreateXMLObject() {
	var obj = null;
	try {
		// Try the IE-version-7-and-all-other-browsers mode
		obj = new XMLHttpRequest();
	} catch (e) {
		try {
			obj = new ActiveXObject("Msxml2.XMLHTTP");
		} catch (e) {
			try {
				obj = new ActiveXObject("Microsoft.XMLHTTP");
			} catch (E) {
				obj = null;
			}
		}
	}
	return obj;
}

function RefreshableUrl(x) {
	var d = new Date();
	var strAddTx = "refresh=" + d.valueOf();
	if (x.indexOf("?") != -1) {
		return x + "&" + strAddTx;
	} else {
		return x + "?" + strAddTx;
	}
}

function XMLTransmission(strMethod, strUrl, strPost, fnOnResult, fnParam) {
	if (!document.XMLRequest) document.XMLRequest = CreateXMLObject();
	var objXML = document.XMLRequest;
	var bIsPost = (strMethod == "POST");
	objXML.open(bIsPost ? "POST" : "GET", RefreshableUrl(strUrl), true);
	if (bIsPost) objXML.setRequestHeader("content-type", "application/x-www-form-urlencoded");
	objXML.onreadystatechange = newReadyStateHandler(objXML, fnOnResult, fnParam);
	objXML.send(bIsPost ? strPost : null);
	return objXML;
}
function newReadyStateHandler(objXML, HandlerFunction, param) {
	if (HandlerFunction) {
		try {
			  return function () {
					if (objXML.readyState == 4) {
						HandlerFunction(objXML, param);
					}
			  }
		} catch (err) {}
	}
}


// ******************************************************************************************
// CSS manipulation
// ******************************************************************************************

function AddClass(elem, strClass)
{
	if (strClass == "") return;
	

	var strC = elem.className;
	if (strC == "") {
		elem.className = strClass;
	} else {
		var arrC = strC.split(" ");
		var ctC = arrC.length;
		for (var i = 0; i < ctC; i++) {
			if (arrC[i] == strClass) return;
		}
		
		elem.className += " " + strClass;
	}
}

function RemoveClass(elem, strClass) {
	if (strClass == "") return;
	
	var strC = elem.className;
	if (strC == "") {
		return;
	} else {
		var strNewList = "";
		var arrC = strC.split(" ");
		var ctC = arrC.length;
		for (var i = 0; i < ctC; i++) {
			if (arrC[i] != "" && arrC[i] != strClass) {
				strNewList += (strNewList ? " " : "") + arrC[i];
			}
		}
		
		elem.className = strNewList;
	}
}

function GetSymbolNameAndIcon(x)
{
	if (document.SymbolIconMaps.length) {
		for (var i = 0; i < document.SymbolIconMaps.length; i++) {
			if (document.SymbolIconMaps[i].fromName == x) {
				return "<img src='icon_" + document.SymbolIconMaps[i].toIcon + ".png' class='SymbolIcon'/>" + FormatSymbolName(x);
			}
		}
	}


	if (x.indexOf(".I") > 0) {
		return "<img src='icon_cfd2.png' class='SymbolIcon'/>" + FormatSymbolName(x);
	} else if (x.indexOf("XAU") == 0) {
		return "<img src='icon_gold.png' class='SymbolIcon'/>" + FormatSymbolName(x);
	} else {
		return "<img src='icon_fx.png' class='SymbolIcon'/>" + FormatSymbolName(x);
	}
}

function FormatSymbolName(x)
{
	var langv = GetLanguageValue(x);
	if (langv) return langv;
	
	
	if (document.SymbolNameMaps.length) {
		for (var i = 0; i < document.SymbolNameMaps.length; i++) {
			if (document.SymbolNameMaps[i].fromName == x) return document.SymbolNameMaps[i].toName;
		}
	}
	
	if (x.indexOf("XAUUSD") == 0) {
		return "GOLD USD";
	} else if (x.indexOf("OILUS") == 0) {
		return "US Crude Oil";
	} else if (x.indexOf("DAX.") == 0) {
		return "Germany 30";
	} else if (x.indexOf("STOXX50E.") == 0) {
		return "EU Stocks 50";
	} else if (x.indexOf("NAS100.") == 0) {
		return "US Tech 100";

	} else if (x.indexOf(".I") > 0) {
		return x.substr(0, x.indexOf(".I"));
	} else if (x.length < 6) {
		return x;
	} else {
		return x.substr(0,3) + " " + x.substr(3);
	}

}

function SetInnerHtml(elem, x)
{
	elem.innerHTML = x;
}

function ProcessQueryString()
{
	if (document.location.search) {
		var strList = document.location.search.substr(1);
		if (strList != "") {
			// May be & delimited sections
			var arrSections = strList.split("&");
			for (var iSect = 0; iSect < arrSections.length; iSect++) {
				var strItem = arrSections[iSect];
				var sep = strItem.indexOf("=");
				if (sep < 0) {
					// If not x=y, then treat as a list of symbols
					var syms = strItem.split(",");
					if (syms.length <= 12) {
						document.SymbolList = ProcessSymbolArray(syms);
					}
				} else {
					// Get key/value
					var strKey = strItem.substr(0, sep);
					var strValue = strItem.substr(sep + 1);

					// Process key/value pairs
					if (strKey == "lang") {
						document.UseLanguage = strValue;

						var head  = document.getElementsByTagName("head")[0];
						var link  = document.createElement("link");
						link.rel  = "stylesheet";
						link.type = "text/css";
						link.href = "TopOfBook7-" + strValue + ".css";
						link.media = "all";
						head.appendChild(link);

					} else if (strKey == "css") {
						var head  = document.getElementsByTagName("head")[0];
						var link  = document.createElement("link");
						link.rel  = "stylesheet";
						link.type = "text/css";
						link.href = unescape(strValue);
						link.media = "all";
						head.appendChild(link);

					} else if (strKey == "bgc") {
						var css = "#Container {background: " + unescape(strValue) + ";}";
						AddStylesheet(css);

					} else if (strKey == "txc") {
						var css = "#Container {color: " + unescape(strValue) + ";}";
						css += ".HeaderRow {color: " + unescape(strValue) + ";}";
						css += ".Col_Instrument {color: " + unescape(strValue) + ";}";
						css += ".Col_Spread {color: " + unescape(strValue) + ";}";
						css += ".PriceRise .Price {color: " + unescape(strValue) + ";}";
						css += ".PriceFall .Price {color: " + unescape(strValue) + ";}";
						AddStylesheet(css);

					} else if (strKey == "prbgc") {
						var css = ".PriceRise .Price {background: " + unescape(strValue) + ";}";
						AddStylesheet(css);

					} else if (strKey == "pfbgc") {
						var css = ".PriceFall .Price {background: " + unescape(strValue) + ";}";
						AddStylesheet(css);

					} else if (strKey == "prtxc") {
						var css = ".PriceRise .Price {color: " + unescape(strValue) + ";}";
						AddStylesheet(css);

					} else if (strKey == "pftxc") {
						var css = ".PriceFall .Price {color: " + unescape(strValue) + ";}";
						AddStylesheet(css);

					} else if (strKey == "sym" || strKey == "syms") {
						document.SymbolList = ProcessSymbolArray(strValue.split(","));

					} else if (strKey == "id") {
						document.StorageId = strValue;

					} else {
						// Unrecognised value
					}
				}

			}
		}
	}
}

function AddStylesheet(css)
{
	try {
		var head = document.getElementsByTagName("head")[0];
		var style = document.createElement("style");
		style.type = "text/css";
		if (style.styleSheet) {
			style.styleSheet.cssText = css;
		} else {
			style.appendChild(document.createTextNode(css));
		}
		head.appendChild(style);
	} catch (ex) {}
}

// Processes the symbol array
function ProcessSymbolArray(arr)
{
	try {
		var newarr = [];
		for (var i = 0; i < arr.length; i++) {
			if (arr[i] != "") {
				var arrP = unescape(arr[i]).split(":");
				newarr.push(arrP[0]);

				if (arrP.length > 1) {
					document.SymbolNameMaps.push({fromName: arrP[0], toName: arrP[1]});
					if (arrP.length > 2) {
						document.SymbolIconMaps.push({fromName: arrP[0], toIcon: arrP[2]});
					}				
				}
			}
		}
		return newarr;
	} catch (ex) {alert(ex);}
}

