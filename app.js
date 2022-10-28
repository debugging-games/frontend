const express = require('express')
const http = express()
const { File } = require(`megajs`);
const fs = require(`fs`);

let decryption_key = `YoUGWaXO_KSABy3zjBus7w`;
const repo = File.fromURL(`https://mega.nz/folder/YGAjlICB#${decryption_key}/file/MTJH3KBb`);
let root_children = [];
let systems = [];
let ready = false;


function create_shareable(file)
{
    let type = file.directory ? `folder` : `file`;
    let folder = file.downloadId[0];
    let suffix = file.downloadId[1];
    return `https://mega.nz/folder/${folder}#${decryption_key}/${type}/${suffix}`;
}

function html_template()
{
    return fs.readFileSync(`web/template.html`);
}

function refresh_repo()
{
    repo.loadAttributes((err, file) =>
    {
        if(err)
        {
            console.error(err.message);
            return;
        }
        
        root_children = file.children;

        for(child in root_children)
        {
            if(root_children[child].directory)
            {
                systems.push(root_children[child]);
            }
        }

        ready = true;
    });
}

http.listen(80, () =>
{
    refresh_repo();
});

http.get([`/`, `/index`, `/home`], (req, res) =>
{
    res.send(`a`);
});

http.get(`/systems`, (req, res) =>
{
    let html = `${html_template()}`;
    let body = ``;

    body += `<div class="w3-container">`;
        body += `<ul class="w3-ul w3-border">`;
            for(system in systems)
            {
                body += `<li class="w3-hover-blue">${systems[system].name}</li>`;
            }
        body += `</ul>`;
    body += `</div>`;

    html = html.replace(`\${BODY}`, body);

    res.send(html);
});