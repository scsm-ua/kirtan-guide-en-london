const { render } = require('songbook-md-json-parser');

const resources = require('./resources.json');

render({
    prepareJson: (json, filename) => {
        if (!json.embeds?.length) return;

        const known = new Set(
            (resources[filename]?.audio || []).map(a => a.embed_url)
        );

        json.embeds.forEach(embed => {
            if (!known.has(embed.embed_url)) {
                console.log(`Embed not in resources.json: ${filename} -> ${embed.embed_url}`);
            }
        });

        delete json.embeds;
    }
});
