const gamesClassification = (games) => {
  return Object.values(
    games.reduce(
      (acc, game) => {
        const key = game.system
        if (acc[key] === undefined) {
          return {
            ...acc,
            [key]: {
              tableGroup: game.systemLabel || game.system,
              tableChildren: [game]
            }
          }
        }
        acc[key].tableChildren = [...acc[key].tableChildren, game]
        return acc
      },
      {}
    )
  ).reduce(
    (acc, category) => {
      if (category.tableChildren.length < 2) {
        return [...acc, ...category.tableChildren]
      }
      return [...acc, category]
    },
    []
  )
}

export {gamesClassification}
