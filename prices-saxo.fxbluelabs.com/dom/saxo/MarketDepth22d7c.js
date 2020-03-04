var glbLadderSize = 10;
var MAX_SYMS = 15;

function OnLoad()
{
	document.Symbol = "";  // Means top of book

	document.SymbolDisplayNames = {};
	document.SymbolIcons = {};
	
	ProcessQuerystring();

	var cmb = [document.getElementById("cmbSymbol"), document.getElementById("cmbSymbol2")];

	for (var iOpt = 0; iOpt < 2; iOpt++) {
		var optBlank = document.createElement("OPTION");
		optBlank.text = "";
		optBlank.value = "";
		cmb[iOpt].options.add(optBlank);
	}

	for (var i = 0; i < arrSymbols.length; i++) {
		for (var iOpt = 0; iOpt < 2; iOpt++) {
			var opt = document.createElement("OPTION");
			opt.text = FormatSymbolName(arrSymbols[i]);
			opt.value = arrSymbols[i];
			cmb[iOpt].options.add(opt);
		}
	}


	for (var i = 0; i < Math.min(MAX_SYMS, arrTopOfBook.length); i++) {
		var lnk = "<span class=\"lnkToSymbol\" onclick=\"ShowSymbolMarketDepth('" + arrTopOfBook[i] + "')\">" + GetSymbolNameAndIcon(arrTopOfBook[i]) + "</span>";
		document.getElementById("tr" + i).getElementsByTagName("TD")[0].innerHTML = lnk;
	}
	
	for (var i = arrTopOfBook.length; i < MAX_SYMS; i++) {
		document.getElementById("tr" + i).style.display = "none";
	}


	StartDataCollection();
	setInterval(ProcessClearMarkers, 100);

	try {
		if (document.InitialSelection) {ShowSymbolMarketDepth(document.InitialSelection);}
	} catch (ex) {}
}

function SymbolComboChange(elem)
{
	var strSym = elem.options[elem.selectedIndex].value;
	if (strSym == document.Symbol) return;

	document.getElementById("cmbSymbol").options.selectedIndex = elem.options.selectedIndex;
	document.getElementById("cmbSymbol2").options.selectedIndex = elem.options.selectedIndex;

	document.LastData = {};
	document.PreviousData = null;
	document.LastBid = 0;
	document.LastAsk = 0;
	document.LastBidVol = 0;
	document.LastAskVol = 0;

	document.Symbol = strSym;

	if (document.Symbol == "") {
		document.getElementById("sectionTopOfBook").style.display = "";
		document.getElementById("sectionMarketDepth").style.display = "none";
	} else {
		document.getElementById("sectionTopOfBook").style.display = "none";
		document.getElementById("sectionMarketDepth").style.display = "";
	}
	DisplayData();
}

function ShowTopOfBook()
{
	var cmb = document.getElementById("cmbSymbol");
	cmb.options.selectedIndex= 0;
	SymbolComboChange(cmb);
}

function ShowSymbolMarketDepth(strSym)
{
	var cmb = document.getElementById("cmbSymbol");
	for (var i = 0; i < cmb.options.length; i++) {
		if (cmb.options[i].value == strSym) {
			cmb.options.selectedIndex= i;
			SymbolComboChange(cmb);
			break;
		}
	}
}

function StartDataCollection()
{
	if (document.Symbol == "") {
		StartDataCollection_TopOfBook();
	} else {
		StartDataCollection_MarketDepth();
	}
}


function StartDataCollection_MarketDepth()
{
	var strUrl = "../getdom.aspx?i=" + document.StorageId + "&s=" + document.Symbol;
	if (document.LastDataTimestamp) strUrl += "&r=" + document.LastDataTimestamp;

	XMLTransmission("GET", strUrl, "", OnGotMarketDepth);
}

function OnGotMarketDepth(objXML)
{
	if (objXML) {
		if (objXML.responseText) {
			ParseData(objXML);
		}
		try {if (objXML.abort) {objXML.abort();}} catch (ex) {}
	}
	setTimeout(StartDataCollection, 200);
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
		document.getElementById("ErrorMsg").innerHTML = ex.message;
		//document.getElementById("ErrorRow").style.display = "";
	}
}

function DisplayData()
{
try {
	var v = document.LastData;
	if (!v) return;
	
	if (v.errorMessage) {
		document.getElementById("ErrorMsg").innerHTML = v.errorMessage;
		//document.getElementById("ErrorRow").style.display = "";

	} else {
		// Store the number of decimal places
		document.DecimalPlaces = v.dp;

		// Build separate arrays of bid and offer
		var bid = new Array();
		var ask = new Array();

		if (v.priceData) {
			for (var i = 0; i < v.priceData.prices.length; i++) {
				var P = v.priceData.prices[i];
				if (P.type == 0) {
					bid.push(P);

				} else if (P.type == 1) {
					ask.push(P);

				}
			}
		} else {
			// No data
		}

		ask.sort(SortPriceAscending);
		bid.sort(SortPriceDescending);


		// DISPLAY NORMAL TABLE
		var TotalBidVol = 0, TotalAskVol = 0;

		for (var i = 1; i <= glbLadderSize; i++) {
			if (i > bid.length) {
				SetInnerText(document.getElementById("BidVol" + i), "");
				SetInnerHtml(document.getElementById("BidPrice" + i), "");
			} else {
				SetInnerHtml(document.getElementById("BidPrice" + i), FormatPrice(bid[i-1].price, document.Symbol));
				SetInnerText(document.getElementById("BidVol" + i), FormatQuantity(bid[i-1].quantity));
			}

			if (i > ask.length) {
				SetInnerText(document.getElementById("AskVol" + i), "");
				SetInnerHtml(document.getElementById("AskPrice" + i), "");
			} else {
				SetInnerHtml(document.getElementById("AskPrice" + i), FormatPrice(ask[i-1].price, document.Symbol));
				SetInnerText(document.getElementById("AskVol" + i), FormatQuantity(ask[i-1].quantity));
			}
		}


		for (var i = 0; i < ask.length; i++) TotalAskVol += ask[i].quantity;
		for (var i = 0; i < bid.length; i++) TotalBidVol += bid[i].quantity;


		SetInnerText(document.getElementById("TotalBidVol"), FormatQuantity(TotalBidVol));
		SetInnerText(document.getElementById("TotalAskVol"), FormatQuantity(TotalAskVol));
		document.getElementById("ErrorRow").style.display = "none";

		document.getElementById("TotalBidVol").style.fontWeight = (TotalBidVol > TotalAskVol ? "bold" : "");
		document.getElementById("TotalAskVol").style.fontWeight = (TotalBidVol < TotalAskVol ? "bold" : "");

		if (bid.length > 0 && ask.length > 0) {
			SetInnerText(document.getElementById("Spread"), GetPips(ask[0].price - bid[0].price, document.Symbol));
			SetInnerText(document.getElementById("vwapSpread1"), GetPips(ask[0].price - bid[0].price, document.Symbol));

			// Colour-coding of each individual bid and offer
			if (document.PreviousData) {
				for (var i = 0; i < ask.length; i++) {
					var thisv = ask[i].price;
					if (i < document.PreviousData.asks.length) {
						if (thisv > document.PreviousData.asks[i].price) {
							AddClass(document.getElementById("AskPrice" + (i+1)), "PriceRise");
							RemoveClass(document.getElementById("AskPrice" + (i+1)), "PriceFall");
							CreateClearMarker("ask" + (i+1) + document.Symbol, document.getElementById("AskPrice" + (i+1)));

						} else if (thisv < document.PreviousData.asks[i].price) {
							RemoveClass(document.getElementById("AskPrice" + (i+1)), "PriceRise");
							AddClass(document.getElementById("AskPrice" + (i+1)), "PriceFall");
							CreateClearMarker("ask" + (i+1) + document.Symbol, document.getElementById("AskPrice" + (i+1)));

						} else {

						}
					}
				}

				for (var i = 0; i < bid.length; i++) {
					var thisv = bid[i].price;
					if (i < document.PreviousData.bids.length) {
						if (thisv > document.PreviousData.bids[i].price) {
							AddClass(document.getElementById("BidPrice" + (i+1)), "PriceRise");
							RemoveClass(document.getElementById("BidPrice" + (i+1)), "PriceFall");
							CreateClearMarker("bid" + (i+1) + document.Symbol, document.getElementById("BidPrice" + (i+1)));

						} else if (thisv < document.PreviousData.bids[i].price) {
							RemoveClass(document.getElementById("BidPrice" + (i+1)), "PriceRise");
							AddClass(document.getElementById("BidPrice" + (i+1)), "PriceFall");
							CreateClearMarker("bid" + (i+1) + document.Symbol, document.getElementById("BidPrice" + (i+1)));

						} else {

						}
					}
				}
			}


			/*
			if (document.LastBid && document.LastAsk) {
				var prevBid = document.getElementById("BidPrice1").prev;
				if (prevBid > bid[0].price) {
					RemoveClass(document.getElementById("BidPrice1"), "PriceRise");
					AddClass(document.getElementById("BidPrice1"), "PriceFall");
					CreateClearMarker("bid1" + document.Symbol, document.getElementById("BidPrice1"));

				} else if (prevBid < bid[0].price) {
					AddClass(document.getElementById("BidPrice1"), "PriceRise");
					RemoveClass(document.getElementById("BidPrice1"), "PriceFall");
					CreateClearMarker("bid1" + document.Symbol, document.getElementById("BidPrice1"));
				}
				document.getElementById("BidPrice1").prev = bid[0].price;

				if (document.LastAsk[0].price > ask[0].price) {
					RemoveClass(document.getElementById("AskPrice1"), "PriceRise");
					AddClass(document.getElementById("AskPrice1"), "PriceFall");
					CreateClearMarker("ask1" + document.Symbol, document.getElementById("AskPrice1"));

				} else if (document.LastAsk[0].price < ask[0].price) {
					AddClass(document.getElementById("AskPrice1"), "PriceRise");
					RemoveClass(document.getElementById("AskPrice1"), "PriceFall");
					CreateClearMarker("ask1" + document.Symbol, document.getElementById("AskPrice1"));
				}
			}
			*/

			document.LastBid = bid;
			document.LastAsk = ask;
			document.LastTotalBidVol = TotalBidVol;
			document.LastTotalAskVol = TotalAskVol;
		} else {
			SetInnerText(document.getElementById("Spread"), "");
		}

		// DISPLAY VWAP
		var bands = GetVWAPBands();
		for (var i = 0; i < bands.length; i++) {
			SetInnerText(document.getElementById("vwapLabel" + (i+2)), bands[i].c);
		}

		if (bid.length && ask.length) {
			// Vwap top of book bid price
			{var elem = document.getElementById("vwapBidPrice1");
			var price = bid[0].price
			if (elem.prev) {
				if (price > elem.prev) {
					AddClass(elem, "PriceRise");
					RemoveClass(elem, "PriceFall");
					CreateClearMarker(elem.id, elem);
				} else if (price < elem.prev) {
					RemoveClass(elem, "PriceRise");
					AddClass(elem, "PriceFall");
					CreateClearMarker(elem.id, elem);
				}
			}
			elem.prev = price;
			SetInnerHtml(elem, FormatPrice(price, document.Symbol));}

			// Vwap top of book ask price
			{var elem = document.getElementById("vwapAskPrice1");
			var price = ask[0].price
			if (elem.prev) {
				if (price > elem.prev) {
					AddClass(elem, "PriceRise");
					RemoveClass(elem, "PriceFall");
					CreateClearMarker(elem.id, elem);
				} else if (price < elem.prev) {
					RemoveClass(elem, "PriceRise");
					AddClass(elem, "PriceFall");
					CreateClearMarker(elem.id, elem);
				}
			}
			elem.prev = price;
			SetInnerHtml(elem, FormatPrice(price, document.Symbol));}

			var vwapBid = new Array();
			var vwapAsk = new Array();

			for (var iBand = 0; iBand < bands.length; iBand++) {
				var remain_bid = bands[iBand].v;
				var total_bid = 0;

				for (var iBid = 0; iBid < bid.length; iBid++) {
					var qty = bid[iBid].quantity;
					var pr = bid[iBid].price;
					if (qty && pr) {
						total_bid += (Math.min(remain_bid, qty) * pr);
						remain_bid -= qty;
						if (remain_bid <= 0) iBid = bid.length; // Break out of loop
					}
				}

				if (remain_bid > 0) {
					SetInnerHtml(document.getElementById("vwapBidPrice" + (iBand + 2)), "");
					vwapBid.push(null);

				} else {
					vwapBid.push(total_bid / bands[iBand].v);

					var elem = document.getElementById("vwapBidPrice" + (iBand + 2));
					var price = total_bid / bands[iBand].v;
					if (elem.prev) {
						if (price > elem.prev) {
							AddClass(elem, "PriceRise");
							RemoveClass(elem, "PriceFall");
							CreateClearMarker(elem.id, elem);

						} else if (price < elem.prev) {
							RemoveClass(elem, "PriceRise");
							AddClass(elem, "PriceFall");
							CreateClearMarker(elem.id, elem);

						}
					}
					elem.prev = price;
					SetInnerHtml(elem, FormatPrice(price, document.Symbol));
				}

				var remain_ask = bands[iBand].v;
				var total_ask = 0;

				for (var iAsk = 0; iAsk < ask.length; iAsk++) {
					var qty = ask[iAsk].quantity;
					var pr = ask[iAsk].price;
					if (qty && pr) {
						total_ask += (Math.min(remain_ask, qty) * pr);
						remain_ask -= qty;
						if (remain_ask <= 0) iAsk= ask.length; // Break out of loop
					}
				}

				if (remain_ask > 0) {
					SetInnerHtml(document.getElementById("vwapAskPrice" + (iBand + 2)), "");
					vwapAsk.push(null);
				} else {
					vwapAsk.push(total_ask / bands[iBand].v);

					var elem = document.getElementById("vwapAskPrice" + (iBand + 2));
					var price = total_ask / bands[iBand].v;
					if (elem.prev) {
						if (price > elem.prev) {
							AddClass(elem, "PriceRise");
							RemoveClass(elem, "PriceFall");
							CreateClearMarker(elem.id, elem);

						} else if (price < elem.prev) {
							RemoveClass(elem, "PriceRise");
							AddClass(elem, "PriceFall");
							CreateClearMarker(elem.id, elem);

						}
					}
					elem.prev = price;
					SetInnerHtml(elem, FormatPrice(price, document.Symbol));
				}

				// Spread
				if (vwapBid[iBand] && vwapAsk[iBand]) {
					SetInnerText(document.getElementById("vwapSpread" + (iBand + 2)), GetPips(vwapAsk[iBand] - vwapBid[iBand], document.Symbol));
				}
			}

		} else {
			for (var i = 1; i <= 7; i++) {
				SetInnerHtml(document.getElementById("vwapBidPrice" + i), "");

				SetInnerHtml(document.getElementById("vwapAskPrice" + i), "");

				SetInnerText(document.getElementById("vwapSpread" + i), "");
			}
		}
	}

	document.PreviousData = {bids: bid, asks: ask};
} catch (ex) {
}
}

function FormatQuantity(x)
{
	if (x <= 0) {
		return "-";
	} else if (x < 1000) {
		return x;
	} else if (x < 100000) {
		var v = Math.round(x / 100) / 10;
		if (v == Math.floor(v)) {
			return v + ".0K";
		} else {
			return v + "K";
		}

	} else {
		var v = Math.round(x / 100000) / 10;
		if (v == Math.floor(v)) {
			return v + ".0M";
		} else {
			return v + "M";
		}
	}
}

function GetPips(x, strSym)
{
	return FormatPips(x, strSym);
}

function R1DP(x)
{
	var w = Math.round(x * 10) / 10;
	if (w == Math.floor(w)) {
		return w + ".0";
	} else {
		return w;
	}
}


function FormatPrice(x, strSym)
{
	var strX;
	var bUseDecipip = true;
	if (strSym.indexOf(".I") > 0) {
		strX = x.toFixed(2);
		bUseDecipip = false;
	} else if (strSym.indexOf("JPY") >= 0 || strSym.indexOf("HUF") >= 0 || strSym.indexOf("XA") >= 0) {
		strX = x.toFixed(3);
	} else {
		strX = x.toFixed(5);
	}

	var strMain = strX.substr(0, strX.length - 1);
	var strSub = strX.substr(strX.length - 1);

	if (bUseDecipip) {
		return "<span class='Price'><span class='PriceMain'>" + strMain + "</span><span class='PriceSub'>" + strSub + "</span></span>";
	} else {
		return "<span class='Price'><span class='PriceMain'>" + strMain + strSub + "</span></span>";
	}
}

function FormatPips(x, strSym)
{
	if (strSym.indexOf(".I") > 0) {
		return x.toFixed(1);
	} else if (strSym.indexOf("JPY") >= 0 || strSym.indexOf("HUF") >= 0 || strSym.indexOf("XA") >= 0) {
		return (x * 100).toFixed(1);
	} else if (strSym.indexOf("CZK") >= 0) {
		return (x * 1000).toFixed(1);
	} else {
		return (x * 10000).toFixed(1);
	}
}


function SortPriceAscending(x, y)
{
	return x.price - y.price;
}

function SortPriceDescending(x, y)
{
	return y.price - x.price;
}

function SetInnerHtml(elem, text)
{
	elem.innerHTML = text;
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

function GetVWAPBands()
{
	if (document.Symbol.indexOf("XAG") >= 0) {
		return [{c:"10K oz" , v:10000},{c:"25K oz" , v:25000},{c:"50K oz" , v:50000},{c:"100K oz" , v:100000},{c:"150K oz" , v:150000},{c:"200K oz" , v:200000}];

	} else if (document.Symbol.indexOf("XAU") >= 0) {
		return [{c:"200 oz" , v:200},{c:"500 oz" , v:500},{c:"1000 oz" , v:1000},{c:"1500 oz" , v:1500},{c:"2000 oz" , v:2000},{c:"3000 oz" , v:3000}];

	} else {
		return [{c: "500K", v: 500000},{c: "1M", v: 1000000},{c: "3M", v: 3000000},{c: "5M", v: 5000000},{c: "8M", v: 8000000},{c: "10M", v: 10000000}];
	}
}

function SetVWAPMode(elem)
{
	document.inVWAPMode = elem.checked;
	document.getElementById("MainTable").style.display = (document.inVWAPMode ? "none" : "");
	document.getElementById("VWAPTable").style.display = (document.inVWAPMode ? "" : "none");
	DisplayData();
}


// ####################################################################################################
// Top-of-book functionality
// ####################################################################################################

function StartDataCollection_TopOfBook()
{
	var strUrl = "../getpricesnapshot.aspx?id=" + document.StorageId + "&s=" + arrTopOfBook.join(",");

	XMLTransmission("GET", strUrl, "", OnGotTopOfBook);
}


function OnGotTopOfBook(objXML)
{
	if (objXML) {
		if (objXML.responseText) {
			ParseTopOfBook(objXML);
		}
		try {if (objXML.abort) {objXML.abort();}} catch (ex) {}
	}
	setTimeout(StartDataCollection, 200);
}

function ParseTopOfBook(objXML)
{
	try {
		var v = ParseJSON(objXML.responseText);
		if (!v) return;

		document.LastData = v;
		DisplayTopOfBook();

	} catch (ex) {
	}
}

function DisplayTopOfBook()
{
	var v = document.LastData;
	if (!v) return;

	// Symbols are guaranteed to be in requested order
	for (var i = 0; i < v.symbols.length; i++) {
		var pdata = v.symbols[i];

		if (pdata.bestBid && pdata.bestAsk) {
			var tr = document.getElementById("tr" + i);
			var tds = tr.getElementsByTagName("TD");

			SetInnerHtml(tds[1], FormatTopOfBookPrice(pdata.bestBid, arrTopOfBook[i]));
			SetInnerHtml(tds[2], FormatTopOfBookPrice(pdata.bestAsk, arrTopOfBook[i]));
			SetInnerHtml(tds[3], FormatTopOfBookPips(pdata.bestAsk - pdata.bestBid, arrTopOfBook[i]));

			// Handle changes
			var prevBid = tds[1].getAttribute("prevBid");
			if (prevBid) {
				if (pdata.bestBid > prevBid) {
					AddClass(tds[1], "PriceRise");
					RemoveClass(tds[1], "PriceFall");
					CreateClearMarker("bid" + pdata.symbol,tds[1]);

				} else if (pdata.bestBid < prevBid) {
					RemoveClass(tds[1], "PriceRise");
					AddClass(tds[1], "PriceFall");
					CreateClearMarker("bid" + pdata.symbol,tds[1]);
				}
			}	
			tds[1].setAttribute("prevBid", pdata.bestBid);

			var prevAsk = tds[2].getAttribute("prevAsk");
			if (prevAsk) {
				if (pdata.bestAsk > prevAsk) {
					AddClass(tds[2], "PriceRise");
					RemoveClass(tds[2], "PriceFall");
					CreateClearMarker("ask" + pdata.symbol,tds[2]);

				} else if (pdata.bestBid < prevBid) {
					RemoveClass(tds[2], "PriceRise");
					AddClass(tds[2], "PriceFall");
					CreateClearMarker("ask" + pdata.symbol,tds[2]);
				}
			}	
			tds[2].setAttribute("prevAsk", pdata.bestAsk);

		}
	}		
}

function FormatTopOfBookPrice(x, strSym)
{
	return FormatPrice(x, strSym);
}

function FormatTopOfBookPips(x, strSym)
{
	return FormatPips(x, strSym);
}


// ******************************************************************************************
// Price-change markers
// ******************************************************************************************

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

function RemoveClass(elem, strClass)
{
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


// ******************************************************************************************
// Symbol name formatting
// ******************************************************************************************

function GetSymbolNameAndIcon(x)
{
	// See if there's a specific icon
	if (document.SymbolIcons[x]) {
		return "<img src='icon_" + document.SymbolIcons[x] + ".png' class='SymbolIcon'/>" + FormatSymbolName(x);
	}
	

	if (x.indexOf(".I") > 0) {
		return "<img src='cfdicon.png' class='SymbolIcon'/>" + FormatSymbolName(x);
	} else {
		return "<img src='fxicon.png' class='SymbolIcon'/>" + FormatSymbolName(x);
	}
}

function FormatSymbolName(x)
{
	var langv = GetLanguageValue(x);
	if (langv) return langv;
	
	// Look for overrides to the default processing
	if (document.SymbolDisplayNames[x]) {
		return document.SymbolDisplayNames[x];

	}
	
	if (x.indexOf(".I") > 0) {
		return x.substr(0, x.indexOf(".I"));
	} else if (x.length < 6) {
		return x;
	} else {
		return x.substr(0,3) + " " + x.substr(3);
	}
}


function GetLanguageValue(x) {return null;}


// ******************************************************************************************
// Querystring
// ******************************************************************************************

function ProcessQuerystring()
{
	// May need to update the symbol list from the querystring
	if (document.location.search) {
		var strList = document.location.search.substr(1);
		if (strList != "") {
			// May be & delimited sections
			var arrSections = strList.split("&");
			for (var iSect = 0; iSect < arrSections.length; iSect++) {
				var strItem = arrSections[iSect];
				var sep = strItem.indexOf("=");
				if (sep < 0) {
					// Ignore
				} else {
					// Get key/value
					var strKey = strItem.substr(0, sep);
					var strValue = unescape(strItem.substr(sep + 1));

					// Process key/value pairs
					if (strKey == "lang") {
						document.UseLanguage = strValue;

						var head  = document.getElementsByTagName("head")[0];
						var link  = document.createElement("link");
						link.rel  = "stylesheet";
						link.type = "text/css";
						link.href = "MarketDepth-" + strValue + ".css";
						link.media = "all";
						head.appendChild(link);

					} else if (strKey == "css") {
						var head  = document.getElementsByTagName("head")[0];
						var link  = document.createElement("link");
						link.rel  = "stylesheet";
						link.type = "text/css";
						link.href = strValue;
						link.media = "all";
						head.appendChild(link);

					} else if (strKey == "id") {
						document.StorageId = strValue;

					} else if (strKey == "select") {
						document.InitialSelection = strValue;

					} else if (strKey == "bgc") {
						var css = "#Container {background: " + unescape(strValue) + ";}";
						AddStylesheet(css);

					} else if (strKey == "txc") {
						var css = "#Container {color: " + unescape(strValue) + ";}";
						css += ".lnkTopOfBook {color: " + unescape(strValue) + ";}";
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

					} else if (strKey == "syms") {
						// Process the sym list
						arrSymbols = [];
						arrTopOfBook = [];
						var arrSyms = strValue.split(",");
						for (var i = 0; i < arrSyms.length; i++) {
							var strSymDef = arrSyms[i];
							var arrParams = strSymDef.split(":");
							
							arrSymbols.push(arrParams[0]);

							var bInTopOfBook = true;
							
							if (arrParams.length >= 2) {
								if (arrParams[1] != "") document.SymbolDisplayNames[arrParams[0]] = arrParams[1];
								if (arrParams.length >= 3) {
									if (arrParams[2] != "") document.SymbolIcons[arrParams[0]] = arrParams[2];
									if (arrParams.length >= 4) {
										if (arrParams[3] == "0" || arrParams[3] == "no") bInTopOfBook = false;
									}
								}
							}
							
							if (bInTopOfBook) arrTopOfBook.push(arrParams[0]);
						
						}

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
