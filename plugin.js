(function () {
	var prodI2='http://dmatool.lsjet.com/';
	var apiPrefix='/i2/api/v1/';
	var defaultEntityFieldsQuery='fields=id,name,tag,properties,dictionaryProperty,relations[*(id,name,tag)]'
/*
 /classes/ad_group3 - class structure
 /classes/ad_group3/entities/1152793 - actual entity
 /classes/ad_group3/entities?query=tag:ag122 - SEARCH BY TAG
 */
	function parseLocation(location){
		var parts=location.split('#');
		var data=parts[1];
		parts=data.split('/');
		var ret={};
		ret.class=parts[2];
		if(parts.length==5){
			ret.entityId=parts[4]
		};
		return ret;


	}

	function convertToAce(textarea, mode) {
		var controls = $(textarea).parent().parent().find('.i2-table-row-controls');
		var fscontrol = $('<a><i class="i2-fseditor-button i2-icon icon-edit"></i></a>');

    mode = mode || 'json';
		controls.append(fscontrol);

		fscontrol.on('click', function () {
			var textareaStyle = window.getComputedStyle(textarea),
				holder = document.createElement('div'),
				editor, session;

			$(holder).dialog({
				title: $('#model\\.name').val() +  ' - ' + mode.toUpperCase() + ' Editor',
				width: $(window).width() - 50,
				height: $(window).height() - 50,
				modal: true,
				create: function(event, ui) {
					$("body").css({ overflow: 'hidden' })
				},
				beforeClose: function(event, ui) {
					$("body").css({ overflow: 'inherit' })
				}
			});


			//textarea.style.visibility = 'hidden';
			//textarea.parentNode.insertBefore(holder, textarea);

			ace.config.setModuleUrl('ace/mode/' + mode + '_worker',
            chrome.runtime.getURL('ace/mode/worker-' + mode + '.js'));
			editor = ace.edit(holder);
			editor.commands.removeCommand('find');
			editor.renderer.setShowGutter(true);
			//editor.setTheme("ace/theme/github");

			session = editor.getSession();
			session.setMode('ace/mode/' + mode);
			var value=textarea.value
			if(mode==='json'){
				try{
					var o = JSON.parse(value);
					value = JSON.stringify(o, null, 4);
				}catch(e){
					
				}
			}
			session.setValue(value);


			session.on('change', function () {
				textarea.value = session.getValue();
			});
		})


	}
	function showVisualDiff(left,right,isClass){
		var instance = jsondiffpatch.create({
			objectHash: function(obj, index) {
				if (typeof obj._id !== 'undefined') {
					return obj._id;
				}
				if (typeof obj.id !== 'undefined') {
					return obj.id;
				}
				if (typeof obj.name !== 'undefined') {
					return obj.name;
				}
				return '$$index:' + index;
			}
		});
		var delta = instance.diff(left,right );
		//var html=jsondiffpatch.html.diffToHtml(localVersion[0], remoteVersion[0], delta)
		var html=$(jsondiffpatch.formatters.html.format(delta, left));
		//jsondiffpatch.formatters.html.hideUnchanged();
		var location=parseLocation(document.location.href);
		var title=location.class;
		if(!isClass){
			title+=' : ' +$('#model\\.name').val();
		}
		title+=' Visual Diff (PROD -> LOCAL)';
		$(html).dialog({
			title: title,
			width: $(window).width() - 50,
			height: $(window).height() - 50,
			modal: true,
			create: function(event, ui) {
				$("body").css({ overflow: 'hidden' })
			},
			beforeClose: function(event, ui) {
				$("body").css({ overflow: 'inherit' })
			}
		});
	};

	function compareWithProd(e){
		e.preventDefault();
		var tag=$('#model\\.tag').val();
		var host=document.location.protocol+'//'+document.location.host;
		if(document.location.port){
			host+=':'+document.location.port;
		}

		var location=parseLocation(document.location.href);

		var query='/classes/'+location.class;
		if(location.entityId){
			query+='/entities?query=tag:'+tag+'&'+defaultEntityFieldsQuery;
		}


		var apiUrl=host+apiPrefix+query;
		var prodUrl=prodI2+apiPrefix+query;
		var d1 = $.get(apiUrl);
		var d2 = $.get(prodUrl);

		$.when( d1,d2 ).done(function ( localVersion, remoteVersion ) {
			var left=remoteVersion[0];
			var right=localVersion[0];
			if(location.entityId){
				left=left['records'][0];
				right=right['records'][0];

			}
			showVisualDiff(left,right);
		});

	}


	function compareClassDefinitionWithProd(e){
		e.preventDefault();
		var host=document.location.protocol+'//'+document.location.host;
		if(document.location.port){
			host+=':'+document.location.port;
		}

		var location=parseLocation(document.location.href);

		var query='/classes/'+location.class;
		var apiUrl=host+apiPrefix+query;
		var prodUrl=prodI2+apiPrefix+query;
		var d1 = $.get(apiUrl);
		var d2 = $.get(prodUrl);
		$.when( d1,d2 ).done(function ( localVersion, remoteVersion ) {
			var left=remoteVersion[0];
			var right=localVersion[0];
			showVisualDiff(left,right,true);
		});

	}

	document.addEventListener('DOMNodeInserted', function (e) {
		var node = e.target, text;
		if (node.nodeType === 1 && node.type === 'textarea') {
			if (e.target.value.trim().indexOf('{') === 0) {
				convertToAce(node, 'json');
      } else if (e.target.value.trim().indexOf('<') === 0) {
        convertToAce(node, 'html');
      }
		}

		var button=$(document).has('#save-changes-button');
		if(!button.length){
			var saveButton=$('<div class="form-actions"><button id="save-changes-button" type="submit" class="btn">Save changes</button><button id="cancel-changes-button" type="button" class="btn btn-link">Cancel</button></div>')
			saveButton.insertAfter('.message-holder');
		}

		var breadcrumb=$('.breadcrumb');
		if(breadcrumb.length){
			var menu=$(document).has('.tremezmenu');
			if(!menu.length){
				var btngroup=breadcrumb.find('.pull-right');
				menu='<div class="dropdown tremezmenu btn-group">' +
					'<button class="btn btn-small dropdown-toggle" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-expanded="true">' +
					'<span class="glyphicon-birthday-cake"></span></button>' +
					'<ul class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu1">' +
					'<li role="presentation"><a role="menuitem" tabindex="-1" class="compareWithProd" href="#">Compare with Prod version</a></li>' +
					'<li role="presentation"><a role="menuitem" tabindex="-1" class="compareClassDefinitionWithProd" href="#">Compare Class Def with Prod</a></li>' +
					'</ul>' +
					'</div>';
				menu=$(menu);
				btngroup.prepend(menu);
				$('.compareWithProd').click(compareWithProd);
				$('.compareClassDefinitionWithProd').click(compareClassDefinitionWithProd);

			}


		}

	}, false);




}())
