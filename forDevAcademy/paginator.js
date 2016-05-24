/**
 * paging sort frame
 * MR#35796
 * @date 2013/12/24 
 * @author Jackson Xie
 * v 2.0  [MR#35795]
 * v 2.1  [MR#36437] Add remember function for pagination
 * v 3.0  [Bug#9108]
 * v 3.1  [MR#38462] add if sentence to set current pageIndex in pager object
 * */

/**
 * paging class of js
 */
(function($){
	/**
	 * project name
	 * */
	var _proj = "/" + window.location.pathname.split("/")[1];
	window.Paginator = function (_setting) {
		if(_setting&& (typeof _setting)=="string"){//simple user function of one param
			_setting = {url:_setting};
		}
		this.setting = $.extend({},this.setting, _setting);
		this.pageSizeWork(_setting);
		this.init();
		return this;
	};

	/**
	 * util function
	 * */
	Paginator.util = {
			/**
			 * get language by js url
			 * eg : ..paginator.js?xxx=xxx&language=zh_CN
			 * */
			getLanguage:function getLanguage(){
				var _language = "en_US";
				var _src = $("script").eq(-1).attr("src") ;
				if (_src&&_src.indexOf("language")>=0) {
					_language = _src.split('language=')[1].split('&')[0];
				};
				return _language;
			}
	};
	
	/**
	 * util obj
	 * */
	var _util = Paginator.util;
	
	$.extend(Paginator.prototype , {
		/**
		 * dafault setting
		 * */
		setting:{
			pagingField:"paging",//if need to paging field name
			paging:true,//if need to paging
			type:"js",// form or js
			method:"post",//get or post
			pageType:"Product",//default page type,for every user the same pageType have the same page size
			removeNull:false,//if the parameter value is "" remove it
			formExpr:"form:first",//if the type=="form" need to write Express to get the form 
			pageSize : 60,//default page size
			noData:function(_html){return _html;},//if totalCount == 0 to callback 
			holdFoot : false,
			onePageFoot:true,//if there is only one page display foot
			url:undefined,//page Data url
			submitExpr:undefined,//submit button
			onSubmit:function(_params){},// if return true break
			queryExParams:function(_params){return {};},//expense parameter
			itemPageExpr:"#itemPage",//item page express
			pageFootExpr:"#pageFoot",//foot express
			pageFootHtml:undefined,// foot html code
			countInfoProfix:"itemCountInfoBegin",
			countInfoSuffix:"itemCountInfoEnd",
			debugParams:"#params",//user for debug
			showPage:7,
			waiting:"loading",//loading class
			waitingEvent:undefined,//load event,only one parameter  ,when begin loading parameter is true and end false
			waitingImg: _proj + "/common/resources/images/paging/loading.gif",//wait gif
			noPageInfo:function(_html){this.debug("no page info html:"+ _html);},
			debug:function(_content){window.console||window.console.log(_content);},
			controllerImg:{
				prevEff:_proj + "/common/resources/images/paging/pagePrevEff.gif",
				prevNoEff:_proj + "/common/resources/images/paging/pagePrevGray.gif",
				nextEff:_proj + "/common/resources/images/paging/pageNextEff.gif",
				nextNoEff:_proj + "/common/resources/images/paging/pageNextGray.gif"
			},
			sizeControl:true,// size select default display
			getValueOnNode:function($node,_sortKey){return $node.text();},
			jsSortElementExpr :undefined,
			sortHoldPageIndex:false,
			defaultSort:undefined,//sortKey:"age",orderRule:"asc"      default asc
			sortTitle:"sortTitle",
			sortKey:"sortKey",
			sortValue:"sortValue",//using for js sort to get value
			orderRule:"orderRule",
			orderValue:["asc","desc"],
			ascClass:"sort_up",
			descClass:"sort_down",
			jsComparer:undefined,// js comparer function using for sorting default defaultJsComparer
			displaySort:undefined,// element sort display fn default defaultDisplaySort
			language : _util.getLanguage(),//zh_CN or en_US(default)
			sortSupport:Paginator.sortSupport,
			success:function(_html){return _html;},
			error:function(){return "";},
			begin:function(_params){},
			end:function(_params){}
		},

		init:function(){
			this.pageMain = $(this.setting.itemPageExpr);
			this.pageFoot = $(this.setting.pageFootExpr);
			//this.pageMain.html("");
			this.pageFoot.html("");
			this.formAdapter(this.setting.formExpr);
		},
		
		/**
		 * form submit adapter
		 * */
		formAdapter:function(_formExpr){
			var _this = this;
			if(this.setting.type!=="form")return;
			if($(_formExpr).attr("action")){
				this.setting.url = $(_formExpr).attr("action");
			}
			if($(_formExpr).attr("method")){
				this.setting.method = $(_formExpr).attr("method");
			}
			$(_formExpr).bind("submit",function(){
				_this.setting.url = $(_formExpr).attr("action");
				_params = _this.getParamsOnForm(_formExpr);
				
				if(_this.setting.onSubmit(_params)){
					return false;				
				}			
				try {
					var _val = _this.pageFoot.find("[paginator='pageInput']").val();
					_this.changePage(_val);
					//_this.query(_params);
				} catch(e) { //catch exception
					_this.setting.debug(e);
				}			
				return false;
			});
			if(this.setting.submitExpr){
				$(this.setting.submitExpr).live("click",function(){
					$(_formExpr).submit();
				});
			}
			
		},
		
		jsonString:function(_obj,_fix){
			var _str = "";
			for ( var _key in _obj||{}) {
				_str += "," + _key+":"+_obj[_key]+(_fix?_fix:"");
			}
			return "{"+(_str?_str.substring(1):"")+"}";
		},
		
		/**
		 * get params on form
		 * */
		getParamsOnForm:function(_formExpr){
			_data = $(_formExpr).serializeArray();
			_params = {};
			for(var _index in _data){
				var _value = _data[_index].value;
				var _name = _data[_index].name;
				if(_value===undefined){
					continue;
				}
				if(this.setting.removeNull&&_value===""){
					continue;
				}
				if(_params[_name]!==undefined){
					if(!(_params[_name] instanceof Array)){
						_params[_name] = [_params[_name]];					
					}			
					_params[_name].push(_value);					
				}else{
					_params[_name] = _value;
				}
			}
			return _params;
		},
		
		/**
		 * query parameter
		 * */
		requestParams:undefined,
		/**
		 * page info 
		 * */
		pageObj:undefined,
		/**
		 * item page node
		 * */
		pageMain:undefined,
		/**
		 * sort info
		 * */
		sortObj:{orderAsc :true},
		/**
		 * page foot node
		 * */
		pageFoot:undefined,
		querySuccessTime:0,
		/**
		 * query data
		 *  */
		query:function(_params){
			_params = this.sortWork(_params);
			this.changeDataForm(_params||{});
			this.requestParams = $.extend({},_params||{});
			this.requestParams[this.setting.pagingField] = this.setting.paging;
			var _pageObj = this.createPageObj();
			//MR 38462
			if(_params) {
				if(_params.currentPage) {
					_pageObj.pageIndex = _params.currentPage;
				}
			}
			if(this.pageObj) {
				_pageObj.pageIndex = this.pageObj.pageIndex;
			}
			$.extend(this.requestParams,this.setting.queryExParams());//save expense parameter to requestParams
			_params = $.extend({},_pageObj,this.requestParams);
			this.changeRequest(_params);
			return this;
		},
		
		/**
		 * handle page size
		 * */
		pageSizeWork:function(_setting){
			if(_setting.pageSize){
				return;
			}
			var _pageSize = this.getPageSize();
			if(_pageSize){
				this.setting.pageSize = _pageSize;
			}
		},
		
		sortWork:function(_params){
			var $set = this.setting;
			if($set.defaultSort){
				_params = _params||{};
				this.sortObj.orderAsc = $set.defaultSort[$set.orderRule]==$set.orderValue[0];
				this.sortObj.sortKey = $set.defaultSort[$set.sortKey];
				_params[$set.sortKey] = $set.defaultSort[$set.sortKey];;
				_params[$set.orderRule] = this.sortObj.orderAsc?$set.orderValue[0]:$set.orderValue[1];
			}
			return _params;
		},
		/**
		 * change parameter if array change to id=1,2,3
		 * */
		changeDataForm:function(_params){
			for(var _key in _params){
				var _val = _params[_key];
				if(!(_val instanceof Array)){
					continue;
				}
				var _vals= "";
				for(var _index =0;_index<_val.length;_index++){
					_vals = _vals+","+_val[_index];
				}
				_vals = _vals.length>0?_vals.substring(1):_vals;
				_params[_key] = _vals;
			}
		},
		
		/**
		 * when reflash page hold page index
		 * */
		reflash:function(_holdPageIndex){
			var _newPageObj = {};
			if(this.pageObj===undefined){
				_newPageObj = this.createPageObj();
			}else{
				_newPageObj.pageSize = this.pageObj.pageSize;
				_newPageObj.pageIndex = this.pageObj.pageIndex;
			}
			_newPageObj = _holdPageIndex?_newPageObj:this.createPageObj();
			_params = $.extend({},_newPageObj,this.requestParams);
			this.changeRequest(_params);
		},
		
		/**
		 * return last parameter 
		 * */
		getLastParams:function(_proto){
			if(_proto){
				return this.requestParams;
			}else{
				return $.extend({},this.requestParams);
			}
		},
		
		/**
		 * return last page parameter 
		 * */
		getLastPageObj:function(_proto){
			if(_proto){
				return this.pageObj;
			}else{
				return $.extend({},this.pageObj);
			}
		},
		
		changeRequest:function(_params){
			this.compatibleIntercept(_params);
			this.beginRequest(_params);//
			var _html = this.getPage(_params);
			_html = this.footWork(_html);
			this.pageMain.html(_html);
			this.endRequest(_params);
		},
		
		footWork:function(_html){
			this.savePageObj(_html);
			if(this.pageObj.error){
				return _html;
			}
			if(this.pageObj.totalCount===0){
				if(this.setting.noData){
					_html = this.setting.noData(_html);
				}else{
					_html = "";
				}
			}
			if(this.setting.paging){
				this.createPageFoot();
			}
			return _html;
		},
		
		compatibleIntercept :function(_params){
		},

		beginRequest:function(_params){
			this.doWaitingEvent(true);
			this.setting.begin(_params);
		},

		endRequest:function(_params){
			this.querySuccessTime++;
			var _pageObj = this.pageObj;
			_params = $.extend({pageObj:_pageObj},_params||{});
			this.sortSupport();
			this.setting.end(_params);
			$(this.setting.debugParams).text(this.jsonString(_params,"\n"));
			this.doWaitingEvent(false);
		},
		
		createPageObj:function(){
			var _pageObj = {};
			_pageObj.pageSize = this.setting.pageSize;
			_pageObj.pageIndex = 0;
			return _pageObj;
		},
		
		savePageObj:function(_html){
			var _indexBegin = _html.indexOf(this.setting.countInfoProfix)+this.setting.countInfoProfix.length;
			var _indexEnd = _html.indexOf(this.setting.countInfoSuffix);
			if(_indexEnd<_indexBegin){
				this.setting.noPageInfo(_html);
				this.pageObj = {error:true};
				this.setting.debug(_html);
			}else{
				var _pageCode = _html.substring(_indexBegin,_indexEnd);
				this.pageObj = eval("("+_pageCode+")");
			}
		},
			
		createPageFoot:function(){
			if(!this.pageFoot.html()){
				var _foot = this.getPageFootHtml();
				_foot = this.setting.pageFootHtml?this.setting.pageFootHtml(_foot):_foot;
				this.pageFoot.html(_foot);
				this.bindDirection();
			}
			if(this.pageObj.totalCount===0&&!this.setting.holdFoot){
				this.pageFoot.hide();
			}else{
				this.pageFoot.show();
			}
			if(this.pageObj.totalPage===1&&!this.setting.onePageFoot){
				this.pageFoot.hide();
			}
			this.doOnePage(this.pageObj.totalPage);
			this.doNoPage(this.pageObj.totalPage);
			this.pageFootWork();
		},
		
		/**
		 * one page work
		 * */
		doOnePage:function(_totalPage){
			if(_totalPage===1){
				this.pageFoot.find(".Pagination,.Gotopage").hide();
			}else {
				this.pageFoot.find(".Pagination,.Gotopage").show();
			}
		},
		
		/**
		 * no page work
		 * */
		doNoPage:function(_totalPage){
			if(_totalPage===0){
			}else {
			}
		},
		
		bindJumpPage:function(){
			var _this = this;
			var _html = this.createDirectionButtom();
			this.pageFoot.find("[paginator='pageDirects']").html(_html);
			this.pageFoot.find("[paginator='pageDirects'] a").bind("click",function(){
				var _val = $(this).find("span").text();
				_this.changePage(_val);
			});
			this.pageFoot.find("[paginator='pageDirects'] span").each(function(){
				var _val = $(this).text();
				if(_val==_this.pageObj.pageIndex+1){
					$(this).addClass('page-cur');
				}
			});
		},
		
		/**
		 * load event one parameter when begin loading params is true
		 * */
		doWaitingEvent:function(_loadFlag){
			if(this.setting.waitingEvent){
				this.setting.waitingEvent(_loadFlag);
			}else{
				var _this = this;
				if(_loadFlag){//firefox and IE
					this.pageFoot.find("[paginator='waiting']").addClass(this.setting.waiting);
					setTimeout(function(){
						_this.pageFoot.find("[paginator='waiting']").addClass(_this.setting.waiting);
					},111);
				}else{
					this.pageFoot.find("[paginator='waiting']").removeClass(this.setting.waiting);
					setTimeout(function(){
						_this.pageFoot.find("[paginator='waiting']").removeClass(_this.setting.waiting);
					},333);
				}
			}
		},
		
		bindDirection:function(){
			var _this = this;
			this.pageFoot.find("[paginator='prevPage']").bind("click",function(){
				_this.changePage("prev");
			});
			this.pageFoot.find("[paginator='nextPage']").bind("click",function(){
				_this.changePage("next");
			});
			this.pageFoot.find("[paginator='firstPage']").bind("click",function(){
				_this.changePage("first");
			});
			this.pageFoot.find("[paginator='endPage']").bind("click",function(){
				_this.changePage("end");
			});
			this.pageFoot.find("[paginator='goPage']").bind("click",function(){
				var _val = _this.pageFoot.find("[paginator='pageInput']").val();
				_this.changePage(_val);
			});
			this.pageFoot.find("[paginator='pageInput']").bind("keyup",function(e){
				var _val = $(this).val();
				_val = _val.replace(/^[^1-9]+|[^\d]/g,'');
				_val = _val >_this.pageObj.totalPage ? _this.pageObj.totalPage : _val;
				$(this).val(_val);
				if (e.keyCode == 13)  {
					if (_this.setting.type !== "form") {
						_this.pageFoot.find("[paginator='goPage']").click();
					}	
				}
			});
			if(!this.setting.sizeControl){
				this.pageFoot.find("select[paginator='pageSize']").hide();
			}
			
			this.pageFoot.find("select[paginator='pageSize']").bind("change",function(){
				var _newPageObj = {};
				_newPageObj.pageIndex = 0;
				_this.setting.pageSize = $(this).val();
				_newPageObj.pageSize = _this.setting.pageSize;
				_this.setPageSize(_this.setting.pageSize);
				var _params = $.extend({},_newPageObj,_this.requestParams);
				_this.changeRequest(_params);
			});
		},

		changePage:function(_key){
			var _pageObj =this.pageObj;
			var _newPageIndex = _pageObj.pageIndex;
			switch(_key){
				case "prev": _newPageIndex--;
				break;
				case "next": _newPageIndex++;
				break;
				case "first": _newPageIndex = 0;
				break;
				case "end": _newPageIndex = _pageObj.totalPage-1;
				break;
				default:
					_key--;
					_newPageIndex = _key>_pageObj.totalPage?_pageObj.totalPage:_key;
			}
			if(this.checkPage(_newPageIndex)){
				var _newPageObj = {};
				_newPageObj.pageIndex = _newPageIndex;
				_newPageObj.pageSize = this.setting.pageSize;
				var _params = $.extend({},_newPageObj,this.requestParams);
				this.changeRequest(_params);
			}
		},
		
		getPageInputValue:function(_pageObj){
			if(_pageObj.totalPage==0)return 1;
			if(_pageObj.totalPage==_pageObj.pageIndex+1)return 1;
			return _pageObj.pageIndex+1+1;
		},
		
		/**
		 * write page foot info
		 * */
		pageFootWork:function(){
			var _pageObj = this.pageObj;
			this.pageFoot.find("[paginator='totalPage']").text(_pageObj.totalPage);
			this.pageFoot.find("[paginator='totalCount']").text(_pageObj.totalCount);
			this.pageFoot.find("[paginator='pageInput']").val(this.getPageInputValue(_pageObj));
			this.pageFoot.find("[paginator='pageIndex']").text(_pageObj.pageIndex+1);
			this.pageFoot.find("[paginator='itemBegin']").text(_pageObj.itemBegin+1);
			this.pageFoot.find("[paginator='itemEnd']").text(_pageObj.itemEnd);
			this.pageFoot.find("[paginator='pageSize']").val(_pageObj.pageSize);
			
			//this.bindJumpPage();
			//this.setFootStyle();
			var _imgSrc = undefined;
			if(_pageObj.pageIndex==0){
				this.pageFoot.find("[paginator='firstPage']").hide();
				_imgSrc = this.setting.controllerImg.prevNoEff;
				this.pageFoot.find("[paginator='prevPage']").addClass("noarrow").removeClass("hasarrow");
				this.pageFoot.find("[paginator='prevPage'] a").html("<img src='"+_imgSrc+"'/>");
			}else{
				this.pageFoot.find("[paginator='firstPage']").show();
				_imgSrc = this.setting.controllerImg.prevEff;
				this.pageFoot.find("[paginator='prevPage']").addClass("hasarrow").removeClass("noarrow");
				this.pageFoot.find("[paginator='prevPage'] a").html("<img src='"+_imgSrc+"'/>");
			}
			
			if(_pageObj.pageIndex+1==_pageObj.totalPage){
				this.pageFoot.find("[paginator='endPage']").hide();
				_imgSrc = this.setting.controllerImg.nextNoEff;
				this.pageFoot.find("[paginator='nextPage']").addClass("noarrow").removeClass("hasarrow");
				this.pageFoot.find("[paginator='nextPage'] a").html("<img src='"+_imgSrc+"'/>");
			}else{
				this.pageFoot.find("[paginator='endPage']").show();
				_imgSrc = this.setting.controllerImg.nextEff;
				this.pageFoot.find("[paginator='nextPage']").addClass("hasarrow").removeClass("noarrow");
				this.pageFoot.find("[paginator='nextPage'] a").html("<img src='"+_imgSrc+"'/>");
			}
		},
		/**
		 * check page index
		 * */
		checkPage:function(_pageIndex){
			return _pageIndex>=0&&_pageIndex<=this.pageObj.totalPage-1;
		},

		createDirectionButtom:function(){
			var _htmlSuf = "<a class='next' href='javaScript:;'><span>";
			var _htmlFix = "</span></a>";
			var _htmlMid = "<span class='page-break'>...</span>";
			var _showAdd = this.setting.showPage-1;
			var _cur = this.pageObj.pageIndex;
			var _size = this.pageObj.totalPage;
			var _rightAdd = parseInt(_showAdd/2);
			var _leftAdd = _showAdd-_rightAdd;	
			var _html = "<span>"+(_cur+1)+"</span>";
	
			while(_cur+_rightAdd>_size-1){
				_rightAdd--;
				_leftAdd++;
			}
	
			while(_cur-_leftAdd<0){
				_leftAdd--;
				_rightAdd++;
			}
			
			for(var _index = 1;_index<=_leftAdd;_index++){
				if(_cur-_index<0){
					break;
				}
				_leftAddReal = _index;
				var _htmlCode = _htmlSuf+(_cur-_index+1)+_htmlFix;
				_html = _htmlCode+_html;
			}
			
			if(_cur-_leftAdd>0){
				if(_cur-_leftAdd>1){
					_html =_htmlMid+ _html;
				}
				var _htmlCode = _htmlSuf+'1'+_htmlFix;
				_html = _htmlCode+_html;
			}
			
			for(var _index = 1;_index<=_rightAdd;_index++){
				if(_cur+_index>=_size){
					break;
				}
				var _htmlCode = _htmlSuf+(_cur+_index+1)+_htmlFix;
				_html = _html + _htmlCode;
			}
			
			if(_cur+1+_rightAdd<_size){
				if(_cur+1+_rightAdd<_size-1){
					_html +=_htmlMid;
				}
	
				var _htmlCode = _htmlSuf+_size+_htmlFix;
				_html += _htmlCode;
			}
			return _html;
		},
		
		/**page foot html code*/
		getPageFootHtml:function(){
			var _language = _language||this.setting.language;
			var _data = this.language[_language];
			var _languageSize = _data.size;
			var _languagePage = _data.page;
			var _languageCount = _data.count;
			//var _waitingImg = this.setting.waitingImg;
			//var _waitingClass = this.setting.waiting;
			// _waitingClass = this.setting.waiting;
			var _html = '\
				<table width="100%">\
				<tr>\
				<td nowrap="true" width="15%" height="35px">\
				<span class="ItemBox">'+ _languageCount+': <span paginator="totalCount"></span></span>\
				</td>\
				<td  width="15%"></td>\
				<td width="10%" align="right"><div paginator="waiting"></div>\
				</td>\
				<td align="right" width="50%">\
					<span class="ItemPerPageBox">\
					<select paginator="pageSize">\
						<option value="20">'+_languageSize+': 20</option>\
						<option value="40">'+_languageSize+': 40</option>\
						<option value="60">'+_languageSize+': 60</option>\
					</select>\
					</span>\
					<span class="Gotopage">\
					'+ _languagePage +'<input type="text" size=5 class="pagetext" paginator="pageInput" >\
						<input type="button" value="Go" paginator="goPage">\
					</span>\
					\
					<span class="Pagination">	\
						<span class="finalnum" paginator = "firstPage"><a style="text-decoration: none" href="javascript:;">1</a></span>\
						<span paginator="prevPage">\
							<a style="text-decoration: none" href="javascript:;"/>\
						</span>\
						<span class="pageactive"  paginator="pageIndex"></span>\
						<span paginator="nextPage">\
							<a style="text-decoration: none" href="javascript:;"/>\
						</span>\
						<span class="finalnum" paginator="endPage">\
							<a style="text-decoration: none" paginator="totalPage" href="javascript:;"></a>\
						</span>\
					</span>\
				</td>\
				</tr>\
				</table>\
				';
			return _html;
		},
		
		/**
		 * set page size
		 * */
		setPageSize:function(_pageSize){
			var _pageType = this.setting.pageType;
			$.ajax( {
				cache : false,
				type : "post",
				url :_proj+ "/pagination/setPageSize.action",
				data :{pageSize:_pageSize,pageType:_pageType}, 
				dataType: "json"
			});
		},
		
		/**
		 * get page size
		 * */
		getPageSize:function(){
			var _pageType = this.setting.pageType;
			var _pageSize = 0;
			$.ajax( {
				cache : false,
				async : false,
				type : "post",
				data :{pageType:_pageType}, 
				url : _proj+"/pagination/getPageSize.action",
				dataType: "json",
				success:function(_result){
					_pageSize = _result;
				}
			});
			return _pageSize;
		},
		
		/**
		 * get page reqest html
		 * */
		getPage:function(_params){
			var _this = this;
			var _page = "";
			$.ajax( {
					async : false,
					type : _this.setting.method,
					url : _this.setting.url,
					data : _params || {}, 
					dataType: "html",
					success : function(_html) { 
						_page = _this.setting.success(_html);
						if(_page === undefined){
							_this.setting.debug("function success() must return some thing");
						}
					},
					error:function(_XMLHttpRequest, _textStatus, _errorThrown){
						_page = _this.setting.error(_XMLHttpRequest, _textStatus, _errorThrown);
					},
					complete:function(){
					}
				});
			return _page;
		},
		
		/**
		 * server sort impl
		 * */
		serverSortImpl:function(_params){
			$.extend(this.requestParams,_params);
			this.reflash(this.setting.sortHoldPageIndex);
		},
		
		/**
		 * js sort impl
		 * select sort
		 * */
		jsSortImpl:function(_params){
			this.doWaitingEvent(true);
			var $set = this.setting;
			var _sortKey = _params[$set.sortKey];
			var $elements = $($set.jsSortElementExpr);
			var $newElementSort = [];
			var _comparerFn = $set.jsComparer||this.defaultJsComparer;
			var _displaySortFn = $set.displaySort||this.defaultDisplaySort;
			
			var _valueOfElements = [];
			for ( var i = 0; i < $elements.length; i++) {
				var $element = $($elements[i]);
				var $node = $element.find("["+$set.sortValue+"='"+_sortKey+"']");
				var _value =  $set.getValueOnNode($node,_sortKey);
				_valueOfElements.push(_value);
			}
			
			for ( var i = 0; i < _valueOfElements.length; i++) {
				if(!$elements[i]){
					continue;
				}
				var _keyNodeIndex = i;
				var _value = _valueOfElements[i];
				for ( var j = 0; j < _valueOfElements.length ; j++) {
					if((!$elements[j])|| i==j){
						continue;
					}
					var _nextValue = _valueOfElements[j];
					var _large = _comparerFn(_value,_nextValue,_sortKey);
					if(_large===(_params.orderRule===$set.orderValue[0])){
						_keyNodeIndex = j;
						_value = _valueOfElements[j];
					}
				}
				if(_keyNodeIndex!=i){
					i--;
				}
				$newElementSort.push($elements[_keyNodeIndex]);
				$elements[_keyNodeIndex] = undefined;
			}
			_displaySortFn($newElementSort,this);
			this.doWaitingEvent(false);
		},
		/**
		 * default display elements function
		 * */
		defaultDisplaySort:function($elements,$page){
			var $topNode = $('[position="top"]');
			if($topNode.length==0){
				var _topHtml = '<div position="top"></div>';
				$($($page.setting.jsSortElementExpr)[0]).before(_topHtml);
				$topNode = $('[position="top"]');
			}
			 
			for ( var i = 0; i < $elements.length; i++) {
				$element = $($elements[i]);
				$topNode.before('<div position="insert"></div>');
				$('[position="insert"]').replaceWith($element);
			}
		},
		
		/**
		 * default js comparer
		 * */
		defaultJsComparer:function(_value,_nextValue,_sortKey){
			if(typeof _value ==="number"&& typeof _nextValue==="number"){
				return _value - _nextValue>0;
			}else{
				return _value.localeCompare(_nextValue)>0;
			}
		},
		
		/**
		 * impl sort
		 * */
		sortSupport:function(){
			var $this = this;
			var $set = $this.setting;
			$this.pageMain.find("["+$set.sortKey+"]").each(function(){
				if($(this).find("a").length>0)return false;
				var _nodeHtml = $(this).html();
				var _nodeTitle = $(this).attr($set.sortTitle)||"";
				$(this).html('<a href = "javaScript:;" title="'+_nodeTitle+'">'+_nodeHtml+'</a>');
				$(this).find("a:first").bind("click",function(){
					if($this.pageObj.totalCount==0)return;
					var _sortKey = $(this).parent().attr($set.sortKey);
					if($this.sortObj.sortKey===_sortKey){
						$this.sortObj.orderAsc = !$this.sortObj.orderAsc;
					}else{
						$this.sortObj.sortKey = _sortKey;
						$this.sortObj.orderAsc = true;
					}
					var _params = {};
					_params[$set.sortKey] = _sortKey;
					_params[$set.orderRule] = $this.sortObj.orderAsc?$set.orderValue[0]:$set.orderValue[1];
					if($set.jsSortElementExpr){
						$this.jsSortImpl(_params);
						var _orderRule = _params[$set.orderRule];
						$this.pageMain.find("["+$set.sortKey+"]").find("."+$set.ascClass+",."+$set.descClass).remove();
						$this.pageMain.find("["+$set.sortKey+"="+$this.sortObj.sortKey+"]").each(function(){
							if($this.sortObj.orderAsc){
								if($(this).find("span").length>0){
									$(this).find("span").removeClass($set.descClass).addClass($set.ascClass);
								}else{
									$(this).append(' <span class="'+$set.ascClass+'"></span>');
								}
							}else{
								if($(this).find("span").length>0){
									$(this).find("span").removeClass($set.ascClass).addClass($set.descClass);
								}else{
									$(this).append(' <span class="'+$set.descClass+'"></span>');
								}
							}
						});
					}else{
						$this.serverSortImpl(_params);
					}
				});
			});
			//Mr 36795 add \' for sortKey is *,*
			$this.pageMain.find("["+$set.sortKey+"=\'"+$this.sortObj.sortKey+"\']").each(function(){
				if($this.sortObj.orderAsc){
					$(this).append(' <span class="'+$set.ascClass+'"></span>');
				}else{
					$(this).append(' <span class="'+$set.descClass+'"></span>');
				}
			});
		},
		language:{}
	});
	
	document.write('<script type="text/javascript" src="'+_proj+'/common/resources/language/paginator_zh_CN.js" charset=UTF-8></script>');
	document.write('<script type="text/javascript" src="'+_proj+'/common/resources/language/paginator_en_US.js" charset=UTF-8></script>');
})(jQuery);

