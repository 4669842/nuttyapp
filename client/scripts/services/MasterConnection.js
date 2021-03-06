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
    .factory('MasterConnection', ['$rootScope', 'NuttySession', '$location',
        function($rootScope, NuttySession, $location) {
            var websocketactive = false;
            var wsocketmaster;
            var wrtcmaster;
            var wrtcconns = [];
            var ondata;
            var retobj;
            $rootScope.$watch(function() {
                return NuttySession.sessionid;
            }, function(newval, oldval) {
                if (!newval)
                    return;
                Meteor.call('getWebrtcConfig', $location.host(), function(err, webrtcconfig) {
                    function processinput(data) {
                        var msg = {};
                        if (!data)
                            return;
                        if (data.start) {
                            websocketactive = true;
                            return;
                        }
                        if (data.stop) {
                            websocketactive = false;
                            return;
                        }
                        if (NuttySession.readonly) {
                            if (!data.gettermshot)
                                return;
                        }
                        if (data.gettermshot) {
                            msg.gettermshot = data.gettermshot;
                        } else if (data.newtmuxsession) {
                            msg.newtmuxsession = data.newtmuxsession;
                        } else if (data.data) {
                            msg.data = data.data;
                        } else {
                            return;
                        }
                        if (ondata)
                            ondata(msg);
                    }
                    wsocketmaster = new Meteor.PipeClientMaster(NuttySession.sessionid);
                    wsocketmaster.on('data', function(data) {
                        if (retobj.type !== 'websocket')
                            return;
                        processinput(data);
                    });

                    if (err) {
                        console.log("Meteor.call(getWebrtcConfig) returned : " + (err.reason));
                        return;
                    }

                    if (!webrtcconfig.host)
                        webrtcconfig.host = $location.host();
                    if (!webrtcconfig.port)
                        webrtcconfig.port = 9000;
                    wrtcmaster = new Peer(NuttySession.sessionid, webrtcconfig);
                    wrtcmaster.on('open', function(connid) {
                        console.log("Connected to PeerJS server: " + connid);
                    });
                    wrtcmaster.on('error', function(error) {
                        console.log("PeerJS server disconnected : " + error);
                    });
                    wrtcmaster.on('connection', function(conn) {
                        wrtcconns.push(conn);
                        console.log("Got connection from peer");
                        conn.on('data', function(data) {
                            if (retobj.type !== 'webrtc')
                                return;
                            processinput(data);
                        })
                        function conndisconnect() {
                            var idx = wrtcconns.indexOf(conn);
                            wrtcconns.splice(idx, 1);
                        }
                        conn.on('error', conndisconnect);
                        conn.on('close', conndisconnect);
                    });
                });
            });
            retobj = {
                type: '',
                pipe: {
                    write: function(data) {
                        var msg = {};
                        if (data.data)
                            msg.data = data.data;
                        else if (data.settermshot) {
                            msg.settermshot = data.settermshot;
                        }
                        else if (data.setcursorposition)
                            msg.setcursorposition = data.setcursorposition;
                        else
                            return;
                        if (retobj.type === 'websocket') {
                            if (!websocketactive)
                                return;
                            if (wsocketmaster) {
                                wsocketmaster.send(msg);
                            }
                        } else if (retobj.type === 'webrtc') {
                            // console.log(wrtcconns);
                            for (var i = 0; i < wrtcconns.length; i++) {
                                try {
                                    if (msg.settermshot) {
                                        wrtcconns[i].settermshot = true;
                                    }
                                    if (wrtcconns[i].settermshot)
                                        wrtcconns[i].send(msg);
                                } catch (ex) {
                                    console.log ("unable to write to peer");
                                }
                            }
                        } else {
                            console.log("MasterConnection.type is neither webrtc nor websocket");
                        }
                    },
                    ondata: function(cbk) {
                        ondata = cbk;
                    }
                }
            }
            window.MasterConnection = retobj;
            return retobj;
        }
    ]);
