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
                    'gcmdb-config-default-root-ci': {
                        table: 'x_tusm_gcmdb_config'
                        id: '847419db4de54ede8cc3eaa2906992eb'
                    }
                    'gcmdb-config-gesture-confidence-threshold': {
                        table: 'x_tusm_gcmdb_config'
                        id: 'd36b1f08b4c24c63bfa878bb13cc1f9e'
                    }
                    'gcmdb-config-max-depth': {
                        table: 'x_tusm_gcmdb_config'
                        id: 'c216cd25937548cc9e31553ae463c9cc'
                    }
                    'gcmdb-config-max-nodes': {
                        table: 'x_tusm_gcmdb_config'
                        id: '3a5132b55f9649fc926babcb1a50907d'
                    }
                    'gcmdb-config-read': {
                        table: 'sys_security_acl'
                        id: '09ced7305378473f96b10a527a819478'
                    }
                    'gcmdb-config-write': {
                        table: 'sys_security_acl'
                        id: 'bf7caa895240471ab53c9c5c6ca776e0'
                    }
                    'gcmdb-rest-execute': {
                        table: 'sys_security_acl'
                        id: 'd76472cf5a1b4dc98885e58e53bbc28f'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: 'f5abedbfdb66463ab6f1bae99c818eea'
                    }
                    src_server_graph_traversal_ts: {
                        table: 'sys_module'
                        id: '12f84d94d4ff45c88d461e07de058e8e'
                    }
                }
                composite: [
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
                        table: 'sys_db_object'
                        id: '34809304ac3542688a1e3494f279909b'
                        key: {
                            name: 'x_tusm_gcmdb_config'
                        }
                    },
                    {
                        table: 'ua_table_licensing_config'
                        id: '413a5a3e076c4ed7a59599ce7143388a'
                        key: {
                            name: 'x_tusm_gcmdb_config'
                        }
                    },
                    {
                        table: 'sys_dictionary'
                        id: '5b9252676b5943ba87092a8d0225809d'
                        key: {
                            name: 'x_tusm_gcmdb_config'
                            element: 'x_tusm_gcmdb_setting_value'
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
                        table: 'sys_dictionary'
                        id: '7eb8d3cc9954493793408c016a8e39b4'
                        key: {
                            name: 'x_tusm_gcmdb_config'
                            element: 'x_tusm_gcmdb_setting_name'
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
                        key: {
                            name: 'x_tusm_gcmdb_config'
                            element: 'NULL'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'a2fad38912dd4a6da13edd9f94603124'
                        key: {
                            name: 'x_tusm_gcmdb_config'
                            element: 'x_tusm_gcmdb_active'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'ad424ea0342940f697fe938fe7df0646'
                        key: {
                            name: 'x_tusm_gcmdb_config'
                            element: 'NULL'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'af23d357fcf04d09ba0a76ba6a05fed2'
                        key: {
                            name: 'x_tusm_gcmdb_config'
                            element: 'x_tusm_gcmdb_setting_name'
                            language: 'en'
                        }
                    },
                    {
                        table: 'sys_documentation'
                        id: 'ba7fb688ccc2418e8f521dfbfe54bd10'
                        key: {
                            name: 'x_tusm_gcmdb_config'
                            element: 'x_tusm_gcmdb_setting_value'
                            language: 'en'
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
                        table: 'sys_dictionary'
                        id: 'cbb6a547edca4518a2004f42fe6ce8cc'
                        key: {
                            name: 'x_tusm_gcmdb_config'
                            element: 'x_tusm_gcmdb_active'
                        }
                    },
                ]
            }
        }
    }
}
