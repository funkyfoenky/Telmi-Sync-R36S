const R36S_V20_IMAGE_RELEASES =
  'https://api.github.com/repos/funkyfoenky/Telmi-Story-Teller-R36S-V20/releases'

const R36S_MAIN_IMAGE_RELEASES =
  'https://api.github.com/repos/funkyfoenky/Telmi-Story-Teller-R36S-Main/releases'

const R36S_APP_RELEASES =
  'https://api.github.com/repos/funkyfoenky/Telmi-Sync-R36S/releases'

const MIYOO_APP_RELEASES =
  'https://api.github.com/repos/DantSu/Telmi-Sync/releases'

/** Dernière release stable (ignore pre-releases et brouillons, même si plus récentes). */
const pickLatestStableRelease = (releases) => {
  if (!Array.isArray(releases) || !releases.length) {
    return null
  }
  return releases.find((r) => !r.draft && !r.prerelease) || null
}

const getR36sImageReleasesUrl = (imageProfile) => {
  return imageProfile === 'other' ? R36S_MAIN_IMAGE_RELEASES : R36S_V20_IMAGE_RELEASES
}

export {
  R36S_V20_IMAGE_RELEASES,
  R36S_MAIN_IMAGE_RELEASES,
  R36S_APP_RELEASES,
  MIYOO_APP_RELEASES,
  pickLatestStableRelease,
  getR36sImageReleasesUrl
}
