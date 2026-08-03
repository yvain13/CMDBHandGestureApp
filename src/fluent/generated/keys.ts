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
                    package_json: {
                        table: 'sys_module'
                        id: 'f5abedbfdb66463ab6f1bae99c818eea'
                    }
                }
            }
        }
    }
}
