/*
 * Copyright (c) 2014 krishna.srinivas@gmail.com All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

angular.module('nuttyapp')
    .directive('nuttyChat', function() {
        return {
            templateUrl: "templates/chat.html",
            scope: true,
            restrict: 'E',
            replace: true,
            link: function(scope, element, attrs, termController) {},
            controller: ['$scope', 'NuttySession',
                function($scope, NuttySession) {
                    var chat;
                    var sessionid;
                    var tmpusername;
                    var user;
                    var username;
                    window.chatmsgs = $scope.chatmsgs = [];

                    tmpusername = Session.get("tmpusername");
                    if (!tmpusername) {
                        tmpusername = "guest." + Random.hexString(3);
                        Session.set("tmpusername", tmpusername);
                    }
                    $scope.users = NuttySession.users;
                    $scope.$watch(function() {
                        return NuttySession.sessionid;
                    }, function(newval, oldval) {
                        if (!newval)
                            return;
                        if (newval === sessionid)
                            return;
                        sessionid = newval;
                        window.chat = chat = new Meteor.Broadcast(NuttySession.sessionid);
                        chat.on('data', function(data) {
                            if (!data)
                                return;
                            for (var i = 0; i < $scope.chatmsgs.length; i++) {
                                if ($scope.chatmsgs[i].msgid === data.msgid)
                                    return;
                            }
                            $scope.chatmsgs.push(data);
                            $scope.$apply();
                            setTimeout(function() {
                                document.getElementById("chat-div").scrollTop = document.getElementById("chat-div").scrollHeight;
                            }, 0);
                        });
                    });
                    $scope.$watch(function() {
                        return Meteor.userId();
                    }, function(newval, oldval) {
                        if (newval)
                            $scope.chatwarn = "";
                        else
                            $scope.chatwarn = "Please signin to chat";
                    });
                    $scope.$watch(function() {
                        return $scope.notloggedincnt();
                    }, function(newval, oldval) {
                        $scope.guestcntmsg = "Guests : " + $scope.notloggedincnt();
                    });
                    Deps.autorun(function() {
                        user = Meteor.user();
                        if (user) {
                            username = user.username;
                        } else {
                            username = tmpusername;
                        }
                    });
                    $scope.notloggedincnt = function() {
                        var count = 0;
                        _.each($scope.users, function(element) {
                            if (!element.username) {
                                count++;
                            }
                        });
                        return count;
                    }
                    $scope.loggedincnt = function() {
                        var count = 0;
                        _.each($scope.users, function(element) {
                            if (!element.username)
                                count++;
                        });
                        return count;
                    }
                    $scope.chatsubmit = function() {
                        if (!$scope.msg)
                            return;
                        var msgid = Random.id();
                        $scope.chatmsgs.push({
                            username: username,
                            msg: $scope.msg,
                            msgid: msgid
                        });
                        if (chat) {
                            chat.send({
                                username: username,
                                msg: $scope.msg,
                                msgid: msgid
                            });
                        }
                        $scope.msg = "";
                        setTimeout(function() {
                            document.getElementById("chat-div").scrollTop = document.getElementById("chat-div").scrollHeight;
                        }, 0);
                    }
                }
            ]
        }
    });
