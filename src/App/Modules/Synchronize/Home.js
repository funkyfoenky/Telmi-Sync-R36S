
import { useMemo } from 'react'
import { useLocale } from '../../Components/Locale/LocaleHooks.js'
import { useTelmiSyncParams } from '../../Components/TelmiSyncParams/TelmiSyncParamsHooks.js'
import AppContainer from '../../Layout/Container/AppContainer.js'
import TopBar from '../../Layout/TopBar/TopBar.js'
import Tabs from '../../Components/Tabs/Tabs.js'

import StoriesTab from './Stories/StoriesTab.js'
import StoriesContent from './Stories/StoriesContent.js'
import MusicTab from './Music/MusicTab.js'
import MusicContent from './Music/MusicContent.js'
import GamesTab from './Games/GamesTab.js'
import GamesContent from './Games/GamesContent.js'

import Import from '../Import/Import.js'

import styles from './Synchronize.module.scss'

function SynchronizeHome () {
  const
    {getLocale} = useLocale(),
    {params} = useTelmiSyncParams(),
    tabs = useMemo(
      () => {
        const list = [
          {tab: StoriesTab, content: StoriesContent},
          {tab: MusicTab, content: MusicContent},
        ]
        if (params && params.deviceMode === 'r36s') {
          list.push({tab: GamesTab, content: GamesContent})
        }
        return list
      },
      [params]
    )

  return <Import>
    <TopBar currentModule="Synchronize"/>
    <AppContainer>
      <p className={styles.tooltip}>{getLocale('drag-drop-medias')}</p>
      <Tabs className={styles.tabs} tabs={tabs}/>
    </AppContainer>
  </Import>
}

export default SynchronizeHome
