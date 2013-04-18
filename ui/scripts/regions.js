// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
(function(cloudStack) {
  cloudStack.sections.regions = {
    title: 'label.menu.regions',
    id: 'regions',
    sectionSelect: {
      label: 'label.select-view',
      preFilter: function() { return ['regions']; }
    },
    regionSelector: {
      dataProvider: function(args) {
        $.ajax({
          url: createURL('listRegions&listAll=true'),
          success: function(json) {
            var regions = json.listregionsresponse.region;

            args.response.success({
              data: regions ? regions : [
                { id: -1, name: _l('label.no.data') }
              ]
            });
          }
        });
      }
    },
    sections: {
      regions: {
        id: 'regions',
        type: 'select',
        title: 'label.menu.regions',
        listView: {
          section: 'regions',
          id: 'regions',
          label: 'label.menu.regions',
          fields: {
            name: { label: 'label.name' },
            id: { label: 'ID' },
            endpoint: { label: 'label.endpoint' }
          },
          actions: {
            add: {
              label: 'label.add.region',
							preFilter: function(args) {
                if(isAdmin())
                  return true;
                else
                  return false;
              },
              messages: {
                notification: function() { return 'label.add.region'; }
              },
              createForm: {
                title: 'label.add.region',
                desc: 'message.add.region',
                fields: {
                  id: { label: 'label.id', validation: { required: true } },
                  name: { label: 'label.name', validation: { required: true } },
                  endpoint: { label: 'label.endpoint', validation: { required: true } }
                }
              },
              action: function(args) {
                var data = {
                  id: args.data.id,
                  name: args.data.name,
                  endpoint: args.data.endpoint
                };

                $.ajax({
                  url: createURL('addRegion'),
                  data: data,
                  success: function(json) {
                    var item = json.addregionresponse.region;
                    args.response.success({data: item});
                    $(window).trigger('cloudStack.refreshRegions');
                  },
                  error: function(json) {
                    args.response.error(parseXMLHttpResponse(json));
                  }
                });
              },
              notification: {
                poll: function(args) {
                  args.complete();
                }
              }
            }
          },
          dataProvider: function(args) {
            $.ajax({
              url: createURL('listRegions&listAll=true'),
              success: function(json) {
                var items = json.listregionsresponse.region;
                args.response.success({								 
                  data: items
                });
              },
              error: function(json) {
                args.response.error(parseXMLHttpResponse(json));
              }
            });
          },
          detailView: {
            name: 'Region details',
            viewAll: { path: 'regions.GSLB', label: 'GSLB' },
            actions: {
              edit: {
                label: 'label.edit.region',
                action: function(args) {
                  var data = {
                    id: args.context.regions[0].id,
                    name: args.data.name,
                    endpoint: args.data.endpoint
                  };

                  $.ajax({
                    url: createURL('updateRegion'),
                    data: data,
                    success: function(json) {
                      args.response.success();
                      $(window).trigger('cloudStack.refreshRegions');
                    },
                    error: function(json) {
                      args.response.error(parseXMLHttpResponse(json));
                    }
                  });
                }
              },
              remove: {
                label: 'label.remove.region',
                messages: {
                  notification: function() { return 'label.remove.region'; },
                  confirm: function() { return 'message.remove.region'; }
                },
                preAction: function(args) {
                  var region = args.context.regions[0];

                  /* e.g.
                  region.endpoint	== "http://localhost:8080/client/"
                  document.location.href == "http://localhost:8080/client/#"
                  */
                  /*
                  if(document.location.href.indexOf(region.endpoint) != -1) {
                    cloudStack.dialog.notice({ message: _l('You can not remove the region that you are currently in.') });
                    return false;
                  }
                  */
                  return true;
                },
                action: function(args) {
                  var region = args.context.regions[0];

                  $.ajax({
                    url: createURL('removeRegion'),
                    data: { id: region.id },
                    success: function(json) {
                      args.response.success();
                      $(window).trigger('cloudStack.refreshRegions');
                    },
                    error: function(json) {
                      args.response.error(parseXMLHttpResponse(json));
                    }
                  });
                }
              }
            },
            tabs: {
              details: {
                title: 'label.details',
                fields: [
                  {
                    id: { label: 'label.id' }
                  },
                  {
                    name: { label: 'label.name', isEditable: true },
                    endpoint: { label: 'label.endpoint', isEditable: true }
                  }
                ],
                dataProvider: function(args) {
                  $.ajax({
                    url: createURL('listRegions&listAll=true'),
                    data: { id: args.context.regions[0].id },
                    success: function(json) {
                      var region = json.listregionsresponse.region

                      args.response.success({
											  actionFilter: regionActionfilter,
                        data: region ? region[0] : {}
                      });
                    },
                    error: function(json) {
                      args.response.error(parseXMLHttpResponse(json));
                    }
                  });
                }
              }
            }
          }
        }
      },
      GSLB: {
        id: 'GSLB',
        type: 'select',
        title: 'GSLB',
        listView: {
          id: 'GSLB',
          label: 'GSLB',
          fields: {
            name: { label: 'label.name' },
						gslbdomainname: { label: 'GSLB Domain Name' },
						gslblbmethod: { label: 'Algorithm' }
          },										
					actions: {
            add: {
              label: 'Add GSLB',

              messages: {
                confirm: function(args) {
                  return 'Add GSLB';
                },
                notification: function(args) {
                  return 'Add GSLB';
                }
              },

              createForm: {
                title: 'Add GSLB',
                fields: {
                  name: {
                    label: 'label.name',                    
                    validation: { required: true }
                  },									
                  description: {
                    label: 'label.description'  
                  }, 	
                  gslbdomainname: {
                    label: 'GSLB Domain Name',
                    validation: { required: true }										
                  },			
									gslblbmethod: {					
										label: 'Algorithm',					
										select: function(args) {
											var array1 = [{id: 'roundrobin', description: 'roundrobin'}, {id: 'leastconn', description: 'leastconn'}, {id: 'proximity', description: 'proximity'}];
											args.response.success({
												data: array1
											});														
										}
									},															
									gslbservicetype: {					
										label: 'Service Type',					
										select: function(args) {
											var array1 = [{id: 'tcp', description: 'tcp'}, {id: 'udp', description: 'udp'}];
											args.response.success({
												data: array1
											});														
										},
										validation: { required: true }				
									},		
									domainid: {					
										label: 'Domain',					
										select: function(args) {
											if(isAdmin() || isDomainAdmin()) {
												$.ajax({
													url: createURL('listDomains'),
													data: { 
														listAll: true,
														details: 'min'
													},
													success: function(json) {
														var array1 = [{id: '', description: ''}];
														var domains = json.listdomainsresponse.domain;
														if(domains != null && domains.length > 0) {
															for(var i = 0; i < domains.length; i++) {
																array1.push({id: domains[i].id, description: domains[i].path});
															}
														}
														args.response.success({
															data: array1
														});
													}
												});
											}
											else {
												args.response.success({
													data: null
												});
											}
										},
										isHidden: function(args) {
											if(isAdmin() || isDomainAdmin())
												return false;
											else
												return true;
										}
									},	
									account: { 
										label: 'Account',
										isHidden: function(args) {
											if(isAdmin() || isDomainAdmin())
												return false;
											else
												return true;
										}			
									}		
                }
              },
              action: function(args) {                
								var data = {
								  name: args.data.name,									
									regionid: args.context.regions[0].id,
									gslblbmethod: args.data.gslblbmethod,
									gslbstickysessionmethodname: 'sourceip',
									gslbdomainname: args.data.gslbdomainname,
									gslbservicetype: args.data.gslbservicetype
								};	
                if(args.data.description != null && args.data.description.length > 0)
								  $.extend(data, { description: args.data.description }); 
                if(args.data.domainid != null && args.data.domainid.length > 0)
								  $.extend(data, { domainid: args.data.domainid });  								  		
                if(args.data.account != null && args.data.account.length > 0)
								  $.extend(data, { account: args.data.account });   
								
                $.ajax({
                  url: createURL('createGlobalLoadBalancerRule'),
                  data: data,                 
                  success: function(json) {		
										var jid = json.creategloballoadbalancerruleresponse.jobid;										              
										args.response.success(
											{_custom:
											 {jobId: jid,
												getUpdatedItem: function(json) {	                          									  
													return json.queryasyncjobresultresponse.jobresult.globalloadbalancer;
												}
											 }
											}
										);										
                  }
                });
              },
              notification: {
                poll: pollAsyncJobResult
              }
            }
          },
										
          dataProvider: function(args) {
            if('regions' in args.context) {
              var data = {
                regionid: args.context.regions[0].id
              };
              $.ajax({
                url: createURL('listGlobalLoadBalancerRules'),
                data: data,
                success: function(json) {                  
                  var items = json.listgloballoadbalancerrulesresponse.globalloadbalancerrule;
                  args.response.success({
                    data: items
                  });
                }
              });
            }
            else {
              args.response.success({
                data: null
              });
            }
          },
										
					detailView: {
            name: 'GSLB details',
            viewAll: { path: 'regions.lbUnderGSLB', label: 'load balancer rules' },
            actions: {              
							remove: {
                label: 'delete GSLB',
                messages: {
                  confirm: function(args) {
                    return 'Please confirm you want to delete this GSLB';
                  },
                  notification: function(args) {
                    return 'delete GSLB';
                  }
                },
                action: function(args) {								  
									var data = {
									  id: args.context.GSLB[0].id
									};
                  $.ajax({
                    url: createURL("deleteGlobalLoadBalancerRule"),
                    data: data,                    
                    success: function(json) {                      
											var jid = json.deletegloballoadbalancerruleresponse.jobid;
                      args.response.success({
											  _custom: {
												  jobId: jid
												}
											});											
                    }
                  });
                },
                notification: {
                  poll: pollAsyncJobResult
                }
              }
						},												
						tabs: {
              details: {
                title: 'label.details',
                fields: [
								 {
								   name: { label: 'label.name' }
								 },
                 {									  
                    description: { label: 'label.description' },
						        gslbdomainname: { label: 'GSLB Domain Name' },
						        gslblbmethod: { label: 'Algorithm' },
                    gslbservicetype: { label: 'Service Type' },										
                    id: { label: 'ID' }										
                  }
                ],
                dataProvider: function(args) {									  
									var data = {
										id: args.context.GSLB[0].id
									};
									$.ajax({
										url: createURL('listGlobalLoadBalancerRules'),
										data: data,
										success: function(json) {                  
											var item = json.listgloballoadbalancerrulesresponse.globalloadbalancerrule[0];
											args.response.success({
												data: item
											});
										}
									});									
                }
              }
            }						
					}					
        }
      },
						
			lbUnderGSLB: {
        id: 'lbUnderGSLB',
        type: 'select',
        title: 'assigned load balancer rules',
        listView: {
          section: 'lbUnderGSLB',
          id: 'lbUnderGSLB',
          label: 'assigned load balancer rules',
          fields: {
            name: { label: 'label.name' },
            publicport: { label: 'label.public.port' },
						privateport: { label: 'label.private.port' },
						algorithm: { label: 'label.algorithm' }
          },					
					dataProvider: function(args) {					
						var data = {
						  globalloadbalancerruleid: args.context.GSLB[0].id,
						  listAll: true
						};
            $.ajax({
              url: createURL('listLoadBalancerRules'),
							data: data,
              success: function(json) {
                var items = json.listloadbalancerrulesresponse.loadbalancerrule;
                args.response.success({								 
                  data: items
                });
              }
            });
          },	        
					actions: {            
            add: {
              label: 'assign load balancer rule to GSLB',
              messages: {
                confirm: function(args) {
                  return 'Please confirm you want to assign load balancer rule to GSLB';
                },
                notification: function(args) {
                  return 'assign load balancer rule to GSLB';
                }
              },
              createForm: {
                title: 'assign load balancer rule to GSLB',              
                fields: {                  
                  loadbalancerrule: {
                    label: 'load balancer rule',                    
                    select: function(args) {		
											var data = {
												globalloadbalancerruleid: args.context.GSLB[0].id,
												listAll: true
											};
											$.ajax({
												url: createURL('listLoadBalancerRules'),
												data: data,
												success: function(json) {
													var items = json.listloadbalancerrulesresponse.loadbalancerrule;
													args.response.success({								 
														data: items,
														descriptionField: 'name'
													});													
												}
											});																						
                    }
                  }  
                }
              },
              action: function(args) {							  
								var data = {
								  id: args.context.GSLB[0].id,
									loadbalancerrulelist: args.data.loadbalancerrule
								};			
                $.ajax({
                  url: createURL('assignToGlobalLoadBalancerRule'),
                  data: data,                 
                  success: function(json) {
                    var jid = json.assigntogloballoadbalancerruleresponse.jobid;
                    args.response.success(
                      {_custom:
                       {jobId: jid,
                        getUpdatedItem: function(json) {
                          return json.queryasyncjobresultresponse.jobresult.loadbalancerrule;
                        }
                       }
                      }
                    );
                  }
                });
              },
              notification: {
                poll: pollAsyncJobResult
              }
            }
					},						
									
					detailView: {
            name: 'load balancer rule details',            
            actions: {              
              remove: {
                label: 'remove load balancer rule from this GSLB',
                messages: {
                  notification: function() { 
									  return 'remove load balancer rule from GSLB'; 
									},
                  confirm: function() { 
									  return 'Please confirm you want to remove load balancer rule from GSLB'; 
									}
                },               
                action: function(args) {								                
                  $.ajax({
                    url: createURL('removeFromGlobalLoadBalancerRule'),
                    data: { 
										  id: args.context.lbUnderGSLB[0].id 
										},
                    success: function(json) {                      							
                      var jid = json.removefromloadbalancerruleresponse.jobid;
                      args.response.success({
											  _custom: {
												  jobId: jid
												}
											});												
                    }
                  });
                },		
								notification: {
                  poll: pollAsyncJobResult
                }								
              }
            },
            tabs: {
              details: {
                title: 'label.details',
                fields: [
                  {
                    name: { label: 'label.name' }
                  },
                  {																
										publicport: { label: 'label.public.port' },
										privateport: { label: 'label.private.port' },
										algorithm: { label: 'label.algorithm' },
										publicip: { label: 'label.public.ip' },	
                    state: { label: 'label.state' },												
										id: { label: 'label.id' },
                    cidrlist: { label: 'label.cidr' },
                    domain: { label: 'label.domain' },
                    account: { label: 'label.account' }                    								
                  }
                ],
                dataProvider: function(args) {									
									$.ajax({
										url: createURL('listLoadBalancerRules'),
										data: {
										  id: args.context.lbUnderGSLB[0].id 
										},
										success: function(json) {
											var item = json.listloadbalancerrulesresponse.loadbalancerrule[0];
											args.response.success({								 
												data: item
											});
										}
									});		
                }
              }
            }
          }
				}
			}			
    }
  };
		
	var regionActionfilter = function(args) {	  
    var allowedActions = [];    
    if(isAdmin()) {        
      allowedActions.push("edit");
			allowedActions.push("remove");
    } 
    return allowedActions;
  }	
	
})(cloudStack);