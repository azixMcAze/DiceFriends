/*
Copyright (c) 2012, azixMcAze
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met: 

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer. 
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution. 

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

The views and conclusions contained in the software and documentation are those
of the authors and should not be interpreted as representing official policies, 
either expressed or implied, of the FreeBSD Project.
*/

/*
* DiceFriends, a plugin for Better Battlelog that adds the playing Dice employees to your comcenter.
*
* @author azixMcAze
* @version 1.1.1-huntdice
* @date 24.09.2012
* @url https://github.com/azixMcAze/DiceFriends
*
* Released under the BSD License.
*/

DiceFriendsPlugin = {
	playerList : [],
	updateInterval : 60*2.5,
	huntDiceData : "http://www.furydivine.net/api/hunt-dice/active/",
	showingDiceFriends : true,
	platformIcon : {
		'pc' : 'common-game-2-1',
		'xbox' : 'common-game-2-2',
		'ps3' : 'common-game-2-4'
	},
	options : {
		'filters' : {
			'pc' : true,
			'xbox' : false,
			'ps3' : false,
			'dice' : true,
			'dev' : true,
			'dicefriend' : false
		}
	},
	platformTranslations : {},

	init : function()
	{
		this.platformTranslations[platforms.PC] = 'pc';
		this.platformTranslations[platforms.XBOX360] = 'xbox';
		this.platformTranslations[platforms.PS3] = 'ps3';

		// add a hook to the refresh function of the comcenter friend list to redraw the dice friend list whenever needed
		var friendListSurface = $S('comcenter-surface-friends');
		friendListSurface.oldUpdate = friendListSurface.update;
		friendListSurface.update = function(itemState, opts) { var ret = this.oldUpdate(itemState, opts); DiceFriendsPlugin.displayPlayerList(); return ret;}
		friendListSurface.oldRefresh = friendListSurface.refresh;
		friendListSurface.refresh = function() { var ret = this.oldRefresh(); DiceFriendsPlugin.displayPlayerList(); return ret;}
		
		// create a style node to append the new css style for the dogtag button
		$('head').append($('<style>').attr('type', 'text/css').text(
			'.comcenter-interact-dogtag-parent {\n\
				height: 24px;\n\
				width: 23px;\n\
				float: right;\n\
				margin-top: 6px;\n\
				display: block;\n\
			}\n\
			.comcenter-interact-dogtag-icon {\n\
				width: 14px;\n\
				height: 14px;\n\
				background: url(http://battlelog-cdn.battlefield.com/public/profile/profile-icons.png) no-repeat scroll -15px 0 transparent;\n\
				background-position: -42px -56px;\n\
				margin-top: 6px;\n\
				margin-left: 5px;\n\
				float: left;\n\
			}\n\
			body.fullwidth .comcenter-interact-dogtag-icon {\n\
				background-position: -70px -56px;\n\
			}\n\
			.comcenter-interact-dogtag-parent:hover .comcenter-interact-dogtag-icon {\n\
				background-position: -42px -56px;\n\
			}\n\
			body.fullwidth .comcenter-interact-dogtag-parent:hover .comcenter-interact-dogtag-icon {\n\
				background-position: -56px -56px;\n\
			}\n\
			.no-dice-dogtag {\n\
				display:none;\n\
			}\n\
			.only-dev-dogtag {\n\
				opacity: .4;\n\
				filter: alpha(opacity=40);\n\
			}\n\
			.comcenter-interact-empty\n\
			{\n\
				height:24px;\n\
				width:23px;\n\
				float:right;\n\
				margin-top:6px;\n\
			}\n\
			.comcenter-username .fake_a\n\
			{\n\
				white-space:nowrap;\n\
				width:132px;\n\
				text-overflow:ellipsis;\n\
				overflow:hidden;\n\
			}\n\
			.comcenter-interact-settings\n\
			{\n\
				width: 24px;\n\
				height: 24px;\n\
				display: inline-block;\n\
				position: absolute;\n\
				right: 12px;\n\
				top: -4px;\n\
				cursor: pointer;\n\
				opacity: .4;\n\
				filter: alpha(opacity=40);\n\
			}\n\
			.comcenter-interact-settings-icon\n\
			{\n\
				width: 14px;\n\
				height: 14px;\n\
				background: url(http://battlelog-cdn.battlefield.com/public/profile/profile-icons.png) no-repeat scroll -15px 0 transparent;\n\
				background-position: -28px -42px;\n\
				margin-left: 5px;\n\
				margin-top: 5px;\n\
			}\n\
			.comcenter-separator:hover .comcenter-interact-settings\n\
			{\n\
				opacity: 1;\n\
				filter: alpha(opacity=100);\n\
			}\n\
			body.fullwidth .comcenter-interact-settings:hover .comcenter-interact-settings-icon\n\
			{\n\
				background-position: -14px -42px;\n\
			}\n\
			.comcenter-interact-settings:hover .comcenter-interact-settings-icon\n\
			{\n\
				background-position: 0px -42px;\n\
			}\n\
			.dicefriends-settings-column\n\
			{\n\
				width: 220px;\n\
				float: left;\n\
				padding-bottom: 10px;\n\
			}\n\
			'
		));
		
		// set a timer to update the friend list periodically
		setInterval(function(){ DiceFriendsPlugin.update(); }, this.updateInterval * 1000);

		// load settings from BBLog's persistent storage
		filters = BBLog.storage('dicefriends-filters');
		if(filters)
			this.options.filters = filters;
	},
	
	update : function()
	{
		this.playerList = [];

		this.getJSON(this.huntDiceData, function(json){
			DiceFriendsPlugin.parseHuntDiceData(json);
			DiceFriendsPlugin.displayPlayerList();
		});
	},
	
	getJSON : function(url, callback)
	{
		$.ajax({url:url, dataType:"jsonp", success:callback, jsonpCallback:"callback"});
	},

	displaySettingsPopup : function()
	{
		popupHtml = $('<div>').addClass('bblog-pop-cont bblog-options').append(
			$('<h2>').addClass('bblog-title').text('Filter players'),
			$('<div>').addClass('').append(
				$('<div>').addClass('dicefriends-settings-column').append(
					$('<h3>').text("By platform"),
					this.displaySettingsOption("PC", 'pc'),
					this.displaySettingsOption("XBOX 360", 'xbox'),
					this.displaySettingsOption("PS3", 'ps3')
				),
				$('<div>').addClass('dicefriends-settings-column').append(
					$('<h3>').text("By dogtag"),
					this.displaySettingsOption("DICE dogtag", 'dice'),
					this.displaySettingsOption("Dev Team dogtag", 'dev'),
					this.displaySettingsOption("DICE Friend dogtag", 'dicefriend')
				)
			),
			$('<p>').addClass('clear'),
			$('<input>').attr('type', 'button').addClass('orange bblog-button save').attr('value', "Apply and Save")
		);

		popupHtml.find('.checkbox').bind('click', function(e){
			$(this).toggleClass('active');
		});

		popupHtml.find('.save').bind('click', function(e){
			DiceFriendsPlugin.saveSettings(popupHtml);
			$('#bblog-modal').hide();
		});

		BBLog.modalWindow('Dice Friends options', popupHtml);
	},

	displaySettingsOption : function(name, dataKey)
	{
		settingHtml = $('<div>').addClass('entry').append(			
			$('<div>').addClass('checkbox').attr('data-key', dataKey),
			$('<span>').addClass('text').text(name)
		)

		if(this.options.filters[dataKey])
		{
			settingHtml.find('.checkbox').addClass('active');
		}

		return settingHtml;
	},

	saveSettings : function(popupHtml)
	{
		popupHtml.find('.checkbox').each(function(index, element) {
			elt = $(element);
			DiceFriendsPlugin.options.filters[elt.attr('data-key')] = elt.hasClass('active');
		});

		BBLog.storage('dicefriends-filters', DiceFriendsPlugin.options.filters);

		DiceFriendsPlugin.update();
	},

	displayComcenterSeparator : function(playerCount)
	{
		$('#comcenterDiceFriends').append(
			$('<li>').attr('id', 'comcenter-dicefriends-separator').addClass('comcenter-separator showing-online').append(
				$('<div>').addClass('dropdownicon'),
				$('<surf:container>').attr('id', 'comcenterDiceFriends').append(
					$('<span>').text(playerCount.toString() + " Dice friend" + (playerCount != 1 ? "s" : ""))
				),
				$('<div>').attr('id', 'comcenter-dicefriends-settings')
						  .addClass('comcenter-interact-settings bubble-title-left')
						  .attr('title', "Open Settings").append(
					$('<div>').addClass('comcenter-interact-settings-icon')
				)
			)
		);
		
		// add the handler to open the settings
		$('#comcenter-dicefriends-settings').bind('click', function (e) {
			DiceFriendsPlugin.displaySettingsPopup();
			e.stopPropagation()
		});


		// add the click handler to collapse the list
		$('#comcenter-dicefriends-separator').bind('click', function (e) {
			var bar = $('#comcenter-dicefriends-separator');
			if (bar.hasClass('showing-online')) {
				bar.removeClass('showing-online');
				$('.comcenter-dicefriend-online').addClass('comcenter-friend-hidden');
				DiceFriendsPlugin.showingDiceFriends = false;
			} else {
				bar.addClass('showing-online');
				$('.comcenter-dicefriend-online').removeClass('comcenter-friend-hidden');
				DiceFriendsPlugin.showingDiceFriends = true;
			}
			comcenter.resizeComCenter();
		});

	},

	displayPlayer : function(player, separatorValue)
	{
		var playerContainer = $('<surf:container>').attr('id', 'comcenter-surface-friends_' + player.userId);

		playerContainer.append(
			$('<li>').attr('id', 'comcenter-' + player.userId)
					 .addClass('comcenter-friend-item comcenter-friend comcenter-friend-playing comcenter-dicefriend-online') // comcenter-friend-online
					 .attr('rel', player.userId)
					 .append(
				$('<div>').addClass('comcenter-friend-draggable-dummy'),
				$('<div>').addClass('comcenter-avatar').append(
					$('<div>').attr('rel', player.userId).addClass('base-avatar-container base-avatar-size-small').append(
						$('<div>').addClass('base-avatar-status-overlay base-avatar-status-overlay-playing').append(
							$('<img>').attr('src', player.userAvatar)
									  .attr('width', 22)
									  .attr('height', 22)
						)
					)
				),
				$('<div>').addClass('comcenter-username').append(
					$('<a>').addClass('comcenter-username-link').attr('href', this.makeLocalizedUrl('/user/'+ player.name +'/')).text(player.name),
					$('<div>').addClass('comcenter-username-serverinfo').append(
						$('<div>').addClass('base-left').append(
							$('<span>').addClass('comcenter-full-height common-gameicon-hori bright comcenter-game-icon')
									   .addClass(this.platformIcon[player.platform]),
							$('<span>').addClass('comcenter-small-height common-gameicon-hori comcenter-game-icon')
									   .addClass(this.platformIcon[player.platform])
						),
						$('<div>').addClass('base-left').append(
							$('<span>').addClass('common-playing-link').append(
								(player.serverGuid ?
									($('<a>').attr('title', player.serverName)
											.addClass('common-playing-link base-no-ajax comcenter-playing-link').attr('href', this.makeLocalizedUrl('/servers/show/'+ player.serverGuid +'/'))
											.text(player.serverName))
								:
									($('<span>').addClass('common-playing-link base-no-ajax comcenter-playing-link fake_a').text(player.serverName))
								)
							)
						)
					)
				),
				$('<div>').addClass('comcenter-interact-container').append(
					(player.serverGuid ?
						$('<form>').addClass('join-friend').attr('method', 'POST').attr('action', this.makeLocalizedUrl('/servers/show/'+ player.serverGuid +'/')).append(
							$('<input>').attr('type', 'hidden').attr('name', 'game').attr('value', 2),
							$('<input>').attr('type', 'hidden').attr('name', 'guid').attr('value', player.serverGuid),
							$('<div>').attr('title', "Join Game").addClass('bubble-title-left join-friend-submit-link comcenter-interact-playing')
						)
					:
						$('<div>').addClass('bubble-title-left join-friend-submit-link comcenter-interact-empty')
					),
					$('<a>').attr('title', '')
							.attr('href', this.makeLocalizedUrl('/soldier/' + player.name + '/dogtags/' + player.personaId + '/'))
							.addClass('bubble-title-left comcenter-interact-dogtag-parent').append(
						$('<span>').addClass('comcenter-interact-dogtag-icon')
					)
				)
			)
		);
		
		$('#comcenterDiceFriends').append(playerContainer);
		
		this.updateDogtagDisplay(player);
	},

	displayPlayerList : function()
	{
		// check if container used to add our players exists
		var diceFriendsContainer = $('#comcenterDiceFriends');
		if(diceFriendsContainer.length > 0)
		{
			// if yes, clear it
			diceFriendsContainer.empty();
		}
		else
		{
			// if no, create it
			$('#comcenter-surface-friends .comcenter-add-friend').before(
				$('<surf:container>').attr('id', 'comcenterDiceFriends')
			);
		}
	
		// create the separator
		this.displayComcenterSeparator(this.playerList.length);
		
		// display each player
		for(var i in this.playerList)
		{
			var player = this.playerList[i];
			this.displayPlayer(player);
		}
		
		// collapse the dice friend list if it was previously collapsed
		if(!this.showingDiceFriends)
		{
			$('#comcenter-dicefriends-separator').removeClass('showing-online');
			$('.comcenter-dicefriend-online').addClass('comcenter-friend-hidden');
		}
		
		// ask battlelog to resize the comcenter
		comcenter.resizeComCenter();
		
		
		/*
		Disabled, this element is rendered by battlelog after my hook has been called, overwriting my modifications
		
		// add playing dice friend count to the friend count in the taskbar of compact com center
		var a = $('.comcenter-button-info');
		a.text(a.text() + " - " + this.playerList.length.toString() + " dice");
		*/
	},


	updateDogtagDisplay : function(player)
	{
		var dogtagDiv = $('#comcenter-' + player.userId + ' .comcenter-interact-dogtag-parent');
	
		if(player.hasDiceFriendDogtag)
		{
			dogtagDiv.attr('title', "Dice Friend Dogtag");
			dogtagDiv.removeClass('no-dice-dogtag');
			dogtagDiv.removeClass('only-dev-dogtag');
		}
		else
		{
			if(player.hasDiceDogtag)
			{
				if(player.hasDevDogtag)
				{
					dogtagDiv.attr('title', "Dice & Dev Dogtags");
					dogtagDiv.removeClass('no-dice-dogtag');
					dogtagDiv.removeClass('only-dev-dogtag');
				}
				else
				{
					dogtagDiv.attr('title', "Only Dice Dogtag");
					dogtagDiv.removeClass('no-dice-dogtag');
					dogtagDiv.removeClass('only-dev-dogtag');
				}
			}
			else
			{
				if(player.hasDevDogtag)
				{
					dogtagDiv.attr('title', "Only Dev Dogtag");
					dogtagDiv.removeClass('no-dice-dogtag');
					dogtagDiv.addClass('only-dev-dogtag');
				}
				else
				{
					dogtagDiv.attr('title', "No Dice Dogtags");
					dogtagDiv.addClass('no-dice-dogtag');
					dogtagDiv.removeClass('only-dev-dogtag');
				}
			}
		}
	},


	parseHuntDiceData : function(json)
	{
		var members = json

		for(var i in members)
		{
			var member = members[i];
			var user = member.player;

			// if player is member of the platoon (not only invited) and in a PC game
			if(user.onlineStatus.isPlaying)
			{
				var player =
				{
					name : user.profile.playerName,
					userId : user.profile.playerId,
					personaId : user.profile.personaId,
					userAvatar : user.profile.playerImage,
					serverGuid : user.onlineStatus.serverGUID,
					serverName : user.onlineStatus.serverName,
					platform : user.profile.namespace,
					hasDiceDogtag : user.dogTags.left.nameSID == "ID_DT_N_DTB090_CAMPAIGN",
					hasDevDogtag : user.dogTags.right.nameSID == "ID_DT_N_DTA_DICE",
					hasDiceFriendDogtag : user.dogTags.right.nameSID == 'ID_DT_COMMUNITY_N_DOGTAG'
				}

				if(!this.filterPlayer(player))
					continue;

				this.playerList.push(player);
			}
		}
	},
	
	filterPlayer : function(player)
	{
		return this.options.filters[player.platform]
	},

	makeLocalizedUrl : function(path)
	{
		var url = "";
		if(Surface.urlContext._language != null && Surface.urlContext._language != 'en')
			url = '/bf3/' + Surface.urlContext._language + path;
		else
			url = '/bf3' + path;
		return url;
	},
	
	makeCallbackWithParam  : function(f, p)
	{
		var self = this;
		return function(json) {
			f.call(self, json, p);
		}
	}
}

$(document).ready(function() {
	DiceFriendsPlugin.init();
	DiceFriendsPlugin.update();
})
