import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    bom_json: {
                        table: 'sys_module'
                        id: '57ecffd126bd474f8525939b130dc79f'
                    }
                    br0: {
                        table: 'sys_script'
                        id: '4969926d62d44bffa2e3a897c0a06a49'
                        deleted: true
                    }
                    cs0: {
                        table: 'sys_script_client'
                        id: '6ab4f93434e64f22a99d34c2b8ded08a'
                        deleted: true
                    }
                    'gcmdb-app-menu': {
                        table: 'sys_app_application'
                        id: 'e2baa4bd239544608aafe4fb399a0722'
                    }
                    'gcmdb-config-default-root-ci': {
                        table: 'x_1433234_gcmdb_config'
                        id: '58f1493a609f4d5e98736dec50bf94ee'
                    }
                    'gcmdb-config-gesture-confidence-threshold': {
                        table: 'x_1433234_gcmdb_config'
                        id: 'f920c58ba728418ca244d6c34508ad00'
                    }
                    'gcmdb-config-max-depth': {
                        table: 'x_1433234_gcmdb_config'
                        id: 'd5975239470943998da464419f3efb54'
                    }
                    'gcmdb-config-max-nodes': {
                        table: 'x_1433234_gcmdb_config'
                        id: 'f73028311a30458c9709cc5596cd875a'
                    }
                    'gcmdb-config-read': {
                        table: 'sys_security_acl'
                        id: '09ced7305378473f96b10a527a819478'
                    }
                    'gcmdb-config-write': {
                        table: 'sys_security_acl'
                        id: 'bf7caa895240471ab53c9c5c6ca776e0'
                    }
                    'gcmdb-page-module': {
                        table: 'sys_app_module'
                        id: '8bba51a16c254d15a9f09d1890a4623c'
                    }
                    'gcmdb-param-depth': {
                        table: 'sys_ws_query_parameter'
                        id: 'd1d0aef96d6d41b499f20c31436a3118'
                    }
                    'gcmdb-param-root': {
                        table: 'sys_ws_query_parameter'
                        id: 'f65b32964dca43ad993c230dc92e6b23'
                    }
                    'gcmdb-rest-api': {
                        table: 'sys_ws_definition'
                        id: '0507724bca574b7fb10fb61908b88403'
                    }
                    'gcmdb-rest-execute': {
                        table: 'sys_security_acl'
                        id: 'd76472cf5a1b4dc98885e58e53bbc28f'
                    }
                    'gcmdb-route-ci': {
                        table: 'sys_ws_operation'
                        id: '72edd6a18c7c4c38ad2698b986a8ffdc'
                    }
                    'gcmdb-route-graph': {
                        table: 'sys_ws_operation'
                        id: '18e57d1aeebd4fe1a8d4c5dccf532dd6'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: 'f5abedbfdb66463ab6f1bae99c818eea'
                    }
                    'src_server_config_config-service_ts': {
                        table: 'sys_module'
                        id: '4408254f87b84dfb9d94af74bed1f1b6'
                    }
                    'src_server_graph_ci-handler_ts': {
                        table: 'sys_module'
                        id: 'd8a97a2ee98449bf8236311125801140'
                    }
                    'src_server_graph_cmdb-data_ts': {
                        table: 'sys_module'
                        id: 'de9b583eaeb64d67a618bb57d65508fd'
                    }
                    'src_server_graph_graph-handler_ts': {
                        table: 'sys_module'
                        id: 'b519b22db81648dca554022b26080551'
                    }
                    src_server_graph_health_ts: {
                        table: 'sys_module'
                        id: 'e108e75b8d08436bab2b97b6df319bc4'
                    }
                    src_server_graph_traversal_ts: {
                        table: 'sys_module'
                        id: '12f84d94d4ff45c88d461e07de058e8e'
                    }
                    src_server_script_js: {
                        table: 'sys_module'
                        id: '6d2bd6c1aabd4ba59212542ef4db62a4'
                        deleted: true
                    }
                }
                composite: [
                    {
                        table: 'sys_documentation'
                        id: '094142c26bf44e10b2b7477dd961c712'
                        key: {
                            name: 'x_1433234_gcmdb_config'
                            element: 'x_1433234_gcmdb_setting_value'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_ui_page'
                        id: '1586e38372354b6ea3c92c599fcf05df'
                        key: {
                            endpoint: 'x_1433234_gcmdb_page.do'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '244602410dee43a38a724401f96399f0'
                        key: {
                            sys_security_acl: 'bf7caa895240471ab53c9c5c6ca776e0'
                            sys_user_role: {
                                id: 'dfc480cbe917463d89171e8ad0d982f8'
                                key: {
                                    name: 'admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '2a21840a82574178b26b51dccac8235e'
                        deleted: true
                        key: {
                            application_file: '7745aa9e2e25408c9aa5d70f04ac745d'
                            source_artifact: 'c7163331ae2a432da7ba1a479fab06f3'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '34809304ac3542688a1e3494f279909b'
                        deleted: true
                        key: {
                            name: 'x_tusm_gcmdb_config'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact'
                        id: '360ef4f06f2644539e9b2f10856ec372'
                        key: {
                            name: 'x_1433234_gcmdb_page.do - BYOUI Files'
                        }
                    },
                    {
                        table: 'sys_db_object'
                        id: '3bc7a809931b427cb1ab6b39b5bdc0ee'
                        key: {
                            name: 'x_1433234_gcmdb_config'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '3c133ea5c4614d87a14d2b4aa11c402d'
                        key: {
                            name: 'x_1433234_gcmdb_config'
                            element: 'x_1433234_gcmdb_setting_name'
                            language: 'en'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: '413a5a3e076c4ed7a59599ce7143388a'
                        deleted: true
                        key: {
                            name: 'x_tusm_gcmdb_config'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '509fb45c8fa540ec91b4876b94ef0f5f'
                        key: {
                            name: 'x_1433234_gcmdb_config'
                            element: 'x_1433234_gcmdb_setting_value'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '51e195e065114e89a88e56409fe3b097'
                        deleted: true
                        key: {
                            name: 'x_tusm_gcmdb/main.js.map'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '5b9252676b5943ba87092a8d0225809d'
                        deleted: true
                        key: {
                            name: 'x_tusm_gcmdb_config'
                            element: 'x_tusm_gcmdb_setting_value'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: '5c64c6ff505a4334983a1765b4a268ff'
                        key: {
                            name: 'x_1433234_gcmdb_config'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '745e70358f374562b45ace6bc7225c68'
                        key: {
                            sys_security_acl: 'd76472cf5a1b4dc98885e58e53bbc28f'
                            sys_user_role: {
                                id: 'e084f4fd17844027a60f7efcf6f024c2'
                                key: {
                                    name: 'itil'
                                }
                            }
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '74a1e99fbc1249bb8da0c0449827dcd4'
                        key: {
                            application_file: '1586e38372354b6ea3c92c599fcf05df'
                            source_artifact: '360ef4f06f2644539e9b2f10856ec372'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '76f152cb0e514d4c97f3540c31d516fc'
                        deleted: true
                        key: {
                            application_file: '51e195e065114e89a88e56409fe3b097'
                            source_artifact: 'c7163331ae2a432da7ba1a479fab06f3'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '7745aa9e2e25408c9aa5d70f04ac745d'
                        deleted: true
                        key: {
                            name: 'x_tusm_gcmdb/main'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: '77b71fef12fe4f5c89860fda657c643f'
                        key: {
                            application_file: '8aba5532c514494aa52fbd4b3cf320c5'
                            source_artifact: '360ef4f06f2644539e9b2f10856ec372'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '7eb8d3cc9954493793408c016a8e39b4'
                        deleted: true
                        key: {
                            name: 'x_tusm_gcmdb_config'
                            element: 'x_tusm_gcmdb_setting_name'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '8240cbf57b9d427b89dfcf0f354c95e3'
                        key: {
                            name: 'x_1433234_gcmdb_config'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '846b50d4f6ca4252961933a63f08e513'
                        key: {
                            name: 'x_1433234_gcmdb_config'
                            element: 'x_1433234_gcmdb_setting_name'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '85eee92dacb049a395e46bfcc09e1a46'
                        key: {
                            name: 'x_1433234_gcmdb/main.js.map'
                        }
                    },
                    {
                        table: 'sys_ux_lib_asset'
                        id: '8aba5532c514494aa52fbd4b3cf320c5'
                        key: {
                            name: 'x_1433234_gcmdb/main'
                        }
                    },
                    {
                        table: 'sys_ws_query_parameter_map'
                        id: '963504664e794777a6bc3ed26775b837'
                        key: {
                            web_service_operation: '18e57d1aeebd4fe1a8d4c5dccf532dd6'
                            web_service_query_parameter: 'f65b32964dca43ad993c230dc92e6b23'
                        }
                    },
                    {
                        table: 'sys_ui_page'
                        id: '98d11755b4554b8897229468288c99b1'
                        deleted: true
                        key: {
                            endpoint: 'x_tusm_gcmdb_page.do'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '9b2fb5b86edb41aea9794a41032cb3b5'
                        key: {
                            name: 'x_1433234_gcmdb_config'
                            element: 'x_1433234_gcmdb_active'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: '9c2188e8070040d5944696979ba5e34b'
                        key: {
                            sys_security_acl: '09ced7305378473f96b10a527a819478'
                            sys_user_role: {
                                id: '3f14e5bea84c4bc981a2e7bcb0d836eb'
                                key: {
                                    name: 'admin'
                                }
                            }
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '9f53640c0df54530a676a556c6590f14'
                        deleted: true
                        key: {
                            name: 'x_tusm_gcmdb_config'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'a2fad38912dd4a6da13edd9f94603124'
                        deleted: true
                        key: {
                            name: 'x_tusm_gcmdb_config'
                            element: 'x_tusm_gcmdb_active'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'ad424ea0342940f697fe938fe7df0646'
                        deleted: true
                        key: {
                            name: 'x_tusm_gcmdb_config'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'af23d357fcf04d09ba0a76ba6a05fed2'
                        deleted: true
                        key: {
                            name: 'x_tusm_gcmdb_config'
                            element: 'x_tusm_gcmdb_setting_name'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'ba7fb688ccc2418e8f521dfbfe54bd10'
                        deleted: true
                        key: {
                            name: 'x_tusm_gcmdb_config'
                            element: 'x_tusm_gcmdb_setting_value'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'c0e1b796a81c449e899ea0a7b34482e7'
                        key: {
                            name: 'x_1433234_gcmdb_config'
                            element: 'x_1433234_gcmdb_active'
                            language: 'en'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: 'c338759be5c54d369845db31df2ec37f'
                        key: {
                            name: 'x_1433234_gcmdb_config'
                        }
                    },
                    {
                        table: 'sys_security_acl_role'
                        id: 'c364c40d32d84d9a996154a284ad64e5'
                        key: {
                            sys_security_acl: '09ced7305378473f96b10a527a819478'
                            sys_user_role: {
                                id: 'fd84006aaae047ff85d87345a7a2a97a'
                                key: {
                                    name: 'itil'
                                }
                            }
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact'
                        id: 'c7163331ae2a432da7ba1a479fab06f3'
                        deleted: true
                        key: {
                            name: 'x_tusm_gcmdb_page.do - BYOUI Files'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: 'cbb6a547edca4518a2004f42fe6ce8cc'
                        deleted: true
                        key: {
                            name: 'x_tusm_gcmdb_config'
                            element: 'x_tusm_gcmdb_active'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: 'd68953532114433b9fa0052cd0bc9c31'
                        deleted: true
                        key: {
                            application_file: '98d11755b4554b8897229468288c99b1'
                            source_artifact: 'c7163331ae2a432da7ba1a479fab06f3'
                        }
                    },
                    {
                        table: 'sn_glider_source_artifact_m2m'
                        id: 'f565ec5bcd254549bb1127e8699584d1'
                        key: {
                            application_file: '85eee92dacb049a395e46bfcc09e1a46'
                            source_artifact: '360ef4f06f2644539e9b2f10856ec372'
                        }
                    },
                    {
                        table: 'sys_ws_query_parameter_map'
                        id: 'fda083be729045cbbf47556e1bca8a65'
                        key: {
                            web_service_operation: '18e57d1aeebd4fe1a8d4c5dccf532dd6'
                            web_service_query_parameter: 'd1d0aef96d6d41b499f20c31436a3118'
                        }
                    },
                ]
            }
        }
    }
}
