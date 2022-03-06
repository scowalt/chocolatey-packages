module.exports = {
    latestRelease: async ({ github, context }, owner, repo) => {
        const release = await github.rest.repos.getLatestRelease({
            owner,
            repo,
        });

        return release.data.tag_name;
    },

    latestReleaseUrl: async({github, context}, owner, repo) => {
        const release = await github.rest.repos.getLatestRelease({
            owner,
            repo,
        });

        const asset = release.data.assets.filter((asset) => {
            return asset.name.endsWith('x64.msi');
        });

        return asset[0].browser_download_url;
    }
};
