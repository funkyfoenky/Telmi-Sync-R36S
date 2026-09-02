const
  versionStringToObject = (str) => {
    const parts = String(str).trim().replace(/^v/i, '').split('.').map((v) => parseInt(v, 10))
    if (!parts.length || parts.some((n) => !Number.isFinite(n))) {
      return null
    }
    while (parts.length < 3) {
      parts.push(0)
    }
    return {major: parts[0], minor: parts[1], fix: parts[2]}
  },

  isNewerVersion = (a, b) => {
    const
      va = typeof a === 'string' ? versionStringToObject(a) : a,
      vb = typeof b === 'string' ? versionStringToObject(b) : b

    if (!va || !vb) {
      return false
    }

    return (
      va.major < vb.major ||
      (va.major === vb.major && va.minor < vb.minor) ||
      (va.major === vb.major && va.minor === vb.minor && va.fix < vb.fix)
    )
  }

export { versionStringToObject, isNewerVersion }
