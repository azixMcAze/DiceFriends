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
* @version 1.0.1
* @date 03.07.2012
* @url https://github.com/azixMcAze/DiceFriends
*
* Released under the BSD License.
*/

DiceFriendsPlugin = {
	playerList : [],
	updateInterval : 60*5,
	dicePlatoon : "/platoon/2832655391300702826/listmembers/",
	showingDiceFriends : true,
	
	init : function()
	{
		// add a hook to the refresh function of the comcenter friend list to redraw the dice friend list
		var friendListSurface = $S("comcenter-surface-friends");
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
				background: url(http://battlelog-cdn.battlefield.com/public/profile/profile-icons.png?v=6860) no-repeat scroll -15px 0 transparent;\n\
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
			'
		));
		
		// set a timer to update the friend list periodically
		setInterval(function(){ DiceFriendsPlugin.update(); }, this.updateInterval * 1000);
	},
	
	update : function()
	{
		this.playerList = [];

		BBLog.getJSONFromBattlelog(this.makeLocalizedUrl(this.dicePlatoon), function(json){
			DiceFriendsPlugin.parsePlatoonMembers(json);
			DiceFriendsPlugin.displayPlayerList();
		});
	},
	
	displayComcenterSeparator : function(playerCount)
	{
		$('#comcenterDiceFriends').append(
			$('<li>').attr('id', 'comcenter-dicefriends-separator').addClass("comcenter-separator showing-online").append(
				$('<div>').addClass('dropdownicon')
			).append(
				$('<surf:container>').attr('id', 'comcenterDiceFriends').append(
					$('<span>').text(playerCount.toString() + ' Dice friend' + (playerCount != 1 ? 's' : ''))
				)
			)
		);
		
		// add the click handler to collapse the list
		$("#comcenter-dicefriends-separator").bind("click", function (e) {
			var bar = $("#comcenter-dicefriends-separator");
			if (bar.hasClass("showing-online")) {
				bar.removeClass("showing-online");
				$(".comcenter-dicefriend-online").addClass("comcenter-friend-hidden");
				DiceFriendsPlugin.showingDiceFriends = false;
			} else {
				bar.addClass("showing-online");
				$(".comcenter-dicefriend-online").removeClass("comcenter-friend-hidden");
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
				$('<div>').addClass('comcenter-friend-draggable-dummy')).append(
				$('<div>').addClass('comcenter-avatar').append(
					$('<div>').attr('rel', player.userId).addClass('base-avatar-container base-avatar-size-small').append(
						$('<div>').addClass('base-avatar-status-overlay base-avatar-status-overlay-playing').append(
							$('<img>').attr('src', 'http://www.gravatar.com/avatar/'+ player.userAvatar +'?s=22&d=http%3A%2F%2Fbattlelog-cdn.battlefield.com%2Fpublic%2Fbase%2Fshared%2Fdefault-avatar-22.png%3Fv%3D7909')
									  .attr('width', 22)
									  .attr('height', 22)
						)
					)
				)).append(
				$('<div>').addClass('comcenter-username').append(
					$('<a>').addClass('comcenter-username-link').attr('href', this.makeLocalizedUrl('/user/'+ player.name +'/'))
						.text(player.name)).append(
					$('<div>').addClass('comcenter-username-serverinfo').append(
						$('<div>').addClass('base-left').append(
							$('<span>').addClass('common-playing-link').append(
								$('<a>').attr('title', player.serverName)
										.addClass('common-playing-link base-no-ajax comcenter-playing-link').attr('href', this.makeLocalizedUrl('/servers/show/'+ player.serverGuid +'/'))
										.text(player.serverName)
							)
						)
					)
				)).append(
				$('<div>').addClass('comcenter-interact-container').append(
					$('<form>').addClass('join-friend').attr('method', 'POST').attr('action', this.makeLocalizedUrl('/servers/show/'+ player.serverGuid +'/')).append(
						$('<input>').attr('type', 'hidden').attr('name', 'game').attr('value', 2)).append(
						$('<input>').attr('type', 'hidden').attr('name', 'guid').attr('value', player.serverGuid)).append(
						$('<div>').attr('title', 'Join Game').addClass('bubble-title-left join-friend-submit-link comcenter-interact-playing')
					)).append(
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
			$("#comcenter-dicefriends-separator").removeClass("showing-online");
			$(".comcenter-dicefriend-online").addClass("comcenter-friend-hidden");
		}
		
		// ask battlelog to resize the comcenter
		comcenter.resizeComCenter();
		
		
		/*
		Disabled, this element is rendered by battlelog after my hook has been called, overwriting my modifications
		
		// add playing dice friend count to the friend count in the taskbar of compact com center
		var a = $(".comcenter-button-info");
		a.text(a.text() + " - " + this.playerList.length.toString() + " dice");
		*/
	},


	updateDogtagDisplay : function(player)
	{
		var dogtagDiv = $('#comcenter-' + player.userId + ' .comcenter-interact-dogtag-parent');
	
		if(player.hasDiceDogtag)
		{
			if(player.hasDevDogtag)
			{
				dogtagDiv.attr('title', 'Dice & Dev Dogtags');
				dogtagDiv.removeClass('no-dice-dogtag');
				dogtagDiv.removeClass('only-dev-dogtag');
			}
			else
			{
				dogtagDiv.attr('title', 'Only Dice Dogtag');
				dogtagDiv.removeClass('no-dice-dogtag');
				dogtagDiv.removeClass('only-dev-dogtag');
			}
		}
		else
		{
			if(player.hasDevDogtag)
			{
				dogtagDiv.attr('title', 'Only Dev Dogtag');
				dogtagDiv.removeClass('no-dice-dogtag');
				dogtagDiv.addClass('only-dev-dogtag');
			}
			else
			{
				dogtagDiv.attr('title', 'No Dice Dogtags');
				dogtagDiv.addClass('no-dice-dogtag');
				dogtagDiv.removeClass('only-dev-dogtag');
			}
		}
	},

/*
	parseServer : function(json, player)
	{
		var server = json.context.server;
		player.serverIp = server.ip;
		player.serverPort = server.port;
		player.serverGameId = server.gameId;
		player.serverGame = server.game;
		this.updateServerDisplay(player);
	},
*/
	parseUser : function(json, player)
	{
		var soldiersBox = json.data.soldiersBox;
		for(var i in soldiersBox)
		{
			var soldier = json.data.soldiersBox[i];
			if(soldier.persona.personaId == player.personaId)
			{
				var dogtags = soldier.dogtagsForPersona[player.personaId];
				if(dogtags)
				{
					player.hasDiceDogtag = (dogtags.basicDogTag.nameSID == "ID_DT_N_DTB090_CAMPAIGN");
					player.hasDevDogtag = (dogtags.advancedDogTag.nameSID == "ID_DT_N_DTA_DICE");
				}
				
				this.updateDogtagDisplay(player);
				return;
			}
		}
	},

	parsePlatoonMembers : function(json)
	{
		var members = json.context.listMembers;

		for(var i in members)
		{
			var member = members[i];
			var user = member.user;

			// if player is member of the platoon (not only invited) and in a game
			if(member.membershipLevel >= 4 /*&& user.platform == 1*/ && user.presence.isPlaying)
			{
				var player =
				{
					name : user.username,
					userId : user.userId,
					personaId : member.personaId,
					userAvatar : user.gravatarMd5,
					serverGuid : user.presence.serverGuid,
					serverName : user.presence.serverName
				}
				
				this.playerList.push(player);
				var self = this;
				BBLog.getJSONFromBattlelog(this.makeLocalizedUrl('/user/overviewBoxStats/'+ player.userId +'/'), function() {
						var p = player;
						return function(json)
						{
							self.parseUser(json, p);
						}
					}()
				);
				//BBLog.getJSONFromBattlelog(this.makeLocalizedUrl('/servers/show/'+ player.serverGuid +'/'), this.callbackWithParam(this.parseServer, player));
			}
		}
	},
	
	makeLocalizedUrl : function(path)
	{
		var url = "";
		if(Surface.urlContext._language != null && Surface.urlContext._language != 'en')
			url = '/bf3/' + Surface.urlContext._language + path;
		else
			url = '/bf3' + path;
		return url;
	}

}

$(document).ready(function() {
	DiceFriendsPlugin.init();
	DiceFriendsPlugin.update();
})
