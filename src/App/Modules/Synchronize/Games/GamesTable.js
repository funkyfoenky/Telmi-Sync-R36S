import {useCallback, useEffect, useMemo, useState} from 'react'
import {useModal} from '../../../Components/Modal/ModalHooks.js'
import {useLocale} from '../../../Components/Locale/LocaleHooks.js'
import {gamesClassification} from './GamesClassification.js'
import {isCellSelected} from '../../../Components/Table/TableHelpers.js'
import Table from '../../../Components/Table/Table.js'
import ModalGameFormCover from './ModalGameFormCover.js'
import ModalGameDeleteConfirm from './ModalGameDeleteConfirm.js'
import ModalGamesDeleteConfirm from './ModalGamesDeleteConfirm.js'

const
  gameIds = {},
  gameGetId = (str) => {
    if (gameIds[str] === undefined) {
      gameIds[str] = Object.values(gameIds).length
    }
    return gameIds[str]
  }

function GamesTable({
                      className,
                      id,
                      games,
                      selectedGames,
                      setSelectedGames,
                      onEditCover,
                      onDelete
                    }) {
  const
    {getLocale} = useLocale(),
    {addModal, rmModal} = useModal(),
    [isLoading, setIsLoading] = useState(false),

    {flatTableGames, tableGames} = useMemo(
      () => {
        const flat = games.map((g) => ({
          ...g,
          cellId: gameGetId(g.id),
          cellTitle: g.title,
          cellSubtitle: g.systemLabel + ' — ' + g.fileName,
          cellLabelIcon: g.hasCover ? undefined : '!',
          cellLabelIconText: g.hasCover ? undefined : getLocale('game-no-cover')
        }))
        return {
          flatTableGames: flat,
          tableGames: gamesClassification(flat)
        }
      },
      [games, getLocale]
    ),

    onSelect = useCallback(
      (game) => setSelectedGames((list) => {
        if (Array.isArray(game)) {
          return [
            ...list.reduce((acc, s) => isCellSelected(game, s) ? acc : [...acc, s], []),
            ...game
          ]
        }
        if (isCellSelected(list, game)) {
          return list.filter((v) => v.cellId !== game.cellId)
        }
        return [...list, game]
      }),
      [setSelectedGames]
    ),

    onSelectAll = useCallback(
      (items) => setSelectedGames((list) => {
        if (items.reduce((acc, g) => isCellSelected(list, g) ? acc + 1 : acc, 0) === items.length) {
          return list.filter((g) => !isCellSelected(items, g))
        }
        return [...list, ...items.filter((g) => !isCellSelected(list, g))]
      }),
      [setSelectedGames]
    ),

    onCallbackEdit = useCallback(
      (game) => {
        if (typeof onEditCover !== 'function') {
          return
        }
        addModal((key) => {
          const modal = <ModalGameFormCover key={key}
                                            game={game}
                                            onValidate={(g) => {
                                              onEditCover(g)
                                              setIsLoading(true)
                                              setSelectedGames([])
                                            }}
                                            onClose={() => rmModal(modal)}/>
          return modal
        })
      },
      [onEditCover, setSelectedGames, addModal, rmModal]
    ),

    onCallbackDelete = useCallback(
      (game) => {
        addModal((key) => {
          const modal = <ModalGameDeleteConfirm key={key}
                                                game={game}
                                                onConfirm={() => {
                                                  onDelete([game.id])
                                                  setIsLoading(true)
                                                  setSelectedGames([])
                                                }}
                                                onClose={() => rmModal(modal)}/>
          return modal
        })
      },
      [onDelete, setSelectedGames, addModal, rmModal]
    ),

    onCallbackDeleteSelected = useCallback(
      () => {
        addModal((key) => {
          const modal = <ModalGamesDeleteConfirm key={key}
                                                 onConfirm={() => {
                                                   onDelete(selectedGames.map((g) => g.id))
                                                   setIsLoading(true)
                                                   setSelectedGames([])
                                                 }}
                                                 onClose={() => rmModal(modal)}/>
          return modal
        })
      },
      [onDelete, selectedGames, setSelectedGames, addModal, rmModal]
    )

  useEffect(() => {
    setIsLoading(false)
  }, [games])

  return <Table className={className}
                id={id}
                titleLeft={getLocale('games-local', flatTableGames.length)}
                titleRight={selectedGames.length ? getLocale('games-selected', selectedGames.length) : undefined}
                data={tableGames}
                selectedData={selectedGames}
                onSelect={onSelect}
                onSelectAll={onSelectAll}
                onEdit={onEditCover !== undefined ? onCallbackEdit : undefined}
                onDelete={onCallbackDelete}
                onDeleteSelected={onCallbackDeleteSelected}
                isLoading={isLoading}/>
}

export default GamesTable
