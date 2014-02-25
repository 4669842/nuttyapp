/*
 * https://nutty.io
 * Copyright (c) 2014 krishna.srinivas@gmail.com All rights reserved.
 * GPLv3 License <http://www.gnu.org/licenses/gpl.txt>
 */

angular.module('nuttyapp')
	.directive('recordButtons', function () {
        return {
            templateUrl: "templates/recordButtons.html",
            scope: true,
            restrict: 'E',
            replace: true,
            link: function(scope, element, attrs, Ctrl) {
            },
            controller: ['$scope', 'Recorder', 'NuttyConnection', 'alertBox', 'NuttySession',
            function($scope, Recorder, NuttyConnection, alertBox, NuttySession) {
              var _uploaderr = false;
            	var record = Session.get("record");
              var upload = false;
              var _upload = false;
              var submitted = false;
            	var filename = Session.get("recordfilename");

              if (record && filename) {
                Recorder.start(filename, false, function() {});
              } else {
                record = false;
              }

            	$scope.btnactive = function() {
            		if (record)
	            		return "active";
	            	else
	            		return "";
            	}
            	$scope.recordcolor = function() {
            		if (record)
	            		return "red";
	            	else
	            		return "";
            	}
            	$scope.play = function () {
                        if (filename)
                  		window.open("https://nutty.io/localrecord/"+filename);
                        else
                              alertBox.alert("danger", "No recording available");
            	}
              function uploaderror (event) {
                    alertBox.alert("danger", "Error during upload");
                    _upload = false;
                    _uploaderr = true;
                    $scope.uploadprogressbarshow = false;
                    $scope.$apply();
              }
              function uploadprogressupdate(event) {
                    if(event.lengthComputable) {
                          var percent = event.loaded / event.total * 100;
                          console.log(percent);
                          $scope.uploadprogress = Math.floor(percent);
                          $scope.$apply();
                    }
              }

              $scope.upload = function () {
                console.log("upload clicked");
                submitted = true;
                setTimeout(function() {
                    term.focus();                  
                }, 0);
                _upload = true;
                    // if (_upload) {
                          if (!Recorder.file) {
                                alertBox.alert("danger", "No recording available");
                                $scope.uploaddescshow = false;
                                _upload = false;
                                return;
                          } else if (!Meteor.userId()) {
                                alertBox.alert("danger", "Please signin to upload");
                                $scope.uploaddescshow = false;
                                _upload = false;
                                return;
                          }
                          $scope.uploaddescshow = false;
                          $scope.uploadprogressbarshow = true;
                          $scope.uploadprogress = 10;
                          Meteor.call('s3uploadinfo', NuttySession.sessionid, NuttySession.clientid, function(err, data) {
                                if (err) {
                                      alertBox.alert("danger", "Server err during upload");
                                      $scope.$apply();
                                } else {
                                      var xhr = new XMLHttpRequest();
                                      var fd = new FormData();
                                      _uploaderr = false;
                                      console.log(data);
                                      fd.append('key', data.key);
                                      fd.append('AWSAccessKeyId', data.AWSAccessKeyId);
                                      fd.append('acl', data.acl);
                                      //fd.append('success_action_redirect', data.success_action_redirect);
                                      fd.append('policy', data.policy);
                                      fd.append('signature', data.signature);
                                      fd.append('Content-Type', data.ContentType);

                                      // This file object is retrieved from a file input.
                                      fd.append('file', Recorder.file);

                                      xhr.upload.addEventListener("error", uploaderror);
                                      xhr.upload.addEventListener("progress", uploadprogressupdate);
                                      // xhr.upload.addEventListener("readystatechange", uploadreadystatechange);
                                      xhr.open('POST', 'https://nutty.s3.amazonaws.com', true);

                                      xhr.onreadystatechange = function() {
                                          if (xhr.readyState != 4) {
                                              return;
                                          }
                                          if (!_uploaderr) {
                                                alertBox.alert("success", "upload done! check homepage (https://nutty.io)");
                                                var userId = Meteor.userId();
                                                if (userId) {
                                                      NuttySession.insertrecording({
                                                        owner: userId,
                                                        filename: data.key,
                                                        sessionid: NuttySession.sessionid,
                                                        desc: $scope.uploaddesc,
                                                        createdAt: new Date
                                                      });
                                                } else
                                                  alertBox.alert("danger", "Upload failed, Please signin during upload");
                                          }
                                          $scope.uploadprogressbarshow = false;
                                          _upload = false;
                                          $scope.uploadprogress = 0;
                                          $scope.$apply();
                                      };
                                      xhr.send(fd);
                                }
                          });
                    // }
              }

              $scope._upload = function() {
                if (!_upload) {
                  if (!Recorder.file) {
                        alertBox.alert("danger", "No recording available");
                        return;
                  }
                  else if (!Meteor.userId()) {
                        alertBox.alert("danger", "Please signin to upload");
                        return;
                  }
                  _upload = true;
                  $scope.uploaddescshow = true;
                  setTimeout(function() {
                    $("#inputid").focus();
                  }, 100);
                }
              }

              $scope._uploadactive = function() {
                    if (_upload)
                          return "active";
                    else
                          return "";
              }

              $scope.canceldesc = function() {
                _upload = false;
                $scope.uploaddescshow = false;
                alertBox.alert("danger", "Upload cancelled")
              }

              $scope.uploaddescblur = function() {
                if (!submitted)
                  _upload = false;
                submitted = false;
                $scope.uploaddescshow = false;
              }

            	$scope.record = function() {
            		record = !record;
            		if (record) {
                  filename = Random.hexString(16);
                  Session.set("recordfilename", filename);
                  Session.set("record", true);
            			Recorder.start(filename, true, function() {
            				console.log("recording started");
                                    Recorder.write({
                                          rowcol: 1,
                                          row: term.screenSize.height,
                                          col: term.screenSize.width
                                    });
            				NuttyConnection.write({
		                        data: String.fromCharCode(2) + 'r'
            				})
            			});
            		} else {
                  Session.set("record", false);
            			Recorder.stop();
                }
            		term.focus();
            	}
              $scope.recordbtntooltip = function() {
                    if (record)
                          return "stop recording"
                    else
                          return "start recording"
              }
              }]
        }
    });