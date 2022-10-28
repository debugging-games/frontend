const express = require('express')
const http = express()
const { File } = require(`megajs`);
const fs = require(`fs`);

let decryption_key = `YoUGWaXO_KSABy3zjBus7w`;
const repo = File.fromURL(`https://mega.nz/folder/YGAjlICB#${decryption_key}/file/MTJH3KBb`);
let root_children = [];
let systems = [];
let total_size = 0;
let total_files = 0;

let system_col_map = new Map();
system_col_map.set("Gamecube", "w3-hover-deep-purple");
system_col_map.set("Windows", "w3-hover-cyan");
system_col_map.set("PlayStation", "w3-hover-gray");
system_col_map.set("PlayStation 2", "w3-hover-indigo");
system_col_map.set("PlayStation 4", "w3-hover-blue");
system_col_map.set("3DS", "w3-hover-red");
system_col_map.set("Switch", "w3-hover-red");
system_col_map.set("Android", "w3-hover-green");
system_col_map.set("Xbox", "w3-hover-green");
system_col_map.set("Xbox 360", "w3-hover-green");
system_col_map.set("Xbox One", "w3-hover-green");
system_col_map.set("Other", "w3-hover-black");
system_col_map.set("Namco System N2", "w3-hover-orange");

let ready = false;

function create_shareable(file)
{
    let type = file.directory ? `folder` : `file`;
    let folder = file.downloadId[0];
    let suffix = file.downloadId[1];
    return `https://mega.nz/folder/${folder}#${decryption_key}/${type}/${suffix}`;
}

function has_system(name)
{
    for(system in systems)
    {
        if(systems[system].name == name) return system;
    }

    return -1;
}

function prettify_bytes(bytes)
{
    let kb = bytes / 1000;
    let mb = kb / 1000;
    let gb = mb / 1000;

    if(gb >= 1)
    {
        return `${gb.toFixed(2)} GB`;
    }
    else if(mb >= 1)
    {
        return `${mb.toFixed(2)} MB`;
    }
    else if (kb >= 1)
    {
        return `${kb.toFixed(2)} KB`;
    }
    else
    {
        return `${bytes} B`;
    }
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
                
                for(childChild in root_children[child].children)
                {
                    if(!root_children[child].children[childChild].directory)
                    {
                        total_size += root_children[child].children[childChild].size;
                        total_files++;
                    }
                }
            }
            else
            {
                total_size += root_children[child].size;
                total_files++;
            }
        }

        systems.sort((a, b) =>
        {
            return a.name.localeCompare(b.name);
        });

        ready = true;
    });
}

http.listen(80, () =>
{
    refresh_repo();
});

http.get([`/`, `/index`, `/home`], (req, res) =>
{
    let html = `${html_template()}`;
    let body = ``;
    let changelog = ``;

    let lines = fs.readFileSync(`web/CHANGELOG.TXT`).toString().split(/\n/g);
    let headers = 0;
    for(line in lines)
    {
        if(lines[line].startsWith(`==`))
        {
            headers++;
            if(headers >= 2) break;
        }
        changelog += `<a>${lines[line]}<a><br>`;
    }

    body += `<div class="w3-container">`
        body += `<h1>Debugging.Games</h1>`
        body += `<h3>Your friendly repository filled with tons of applcation data!</h3>`
        body += `<p>\${TOTAL_SIZE} across \${TOTAL_FILES} files</p>`
        body += `<p>Binary data from \${TOTAL_SYSTEMS} different systems</p>`
        body += `<br>`;
        body += `<br>`;
        body += `<h1>Changelog</h1>`;
        body += `\${CHANGELOG}`;
    body += `</div>`

    body = body.replace(`\${TOTAL_SIZE}`, prettify_bytes(total_size));
    body = body.replace(`\${TOTAL_FILES}`, `${total_files}`);
    body = body.replace(`\${TOTAL_SYSTEMS}`, `${systems.length}`);
    body = body.replace(`\${CHANGELOG}`, changelog);
    html = html.replace(`\${BODY}`, body);

    res.send(html);
});

http.get(`/systems`, (req, res) =>
{
    let html = `${html_template()}`;
    let body = ``;

    body += `<div class="w3-container">`;
        body += `<h1>Systems</h1>`;
    body += `</div>`;

    body += `<div class="w3-container" style="width:300px;">`;
        body += `<ul class="w3-ul w3-border">`;
            for(system in systems)
            {
                let color = `class="`;
                let found = ``;
                system_col_map.forEach((value, key) =>
                {
                    if(systems[system].name == key)
                    {
                        found = value;
                        return;
                    }
                });
                
                color += found != `` ? `${found}` : "w3-hover-white";
                color += `"`;

                body += `<li ${color}> <a href="/systems/${systems[system].name}">${systems[system].name} </a> </li>`;
                color = ``;
            }
        body += `</ul>`;
    body += `</div>`;

    html = html.replace(`\${BODY}`, body);

    res.send(html);
});

http.get(`/systems/*`, (req, res) =>
{
    let system = decodeURI(req.url.split('/')[2]);
    let sysIndex = has_system(system);

    if(sysIndex == -1)
    {
        res.redirect('/systems');
        return;
    }

    let files = [];
    let html = `${html_template()}`;
    let body = ``;

    files = systems[sysIndex].children;

    body += `<div class="w3-container">`;
        body += `<h1>${system}</h1>`;
    body += `</div>`;

    body += `<div class="w3-container">`;
        body += `<ul class="w3-ul w3-border-bottom">`;
            for(file in files)
            {
                body += `<li class="w3-hover-white">`;
                body += `<a href="${create_shareable(files[file])}" style="display:inline;">${files[file].name}</a>`;
                body += `<a class="w3-right" style="display:inline;">${prettify_bytes(files[file].size)}</a>`;
                body += `</li>`;
            }
        body += `</ul>`;
    body += `</div>`;

    html = html.replace(`\${BODY}`, body);

    res.send(html);
});

http.get([`/search`, `/search/`], (req, res) =>
{
    let html = `${html_template()}`;
    let body = ``;

    body += `<div class="w3-container">`;
        body += `<h1>Search</h1>`;
    body += `</div>`;

    body += `<form class="w3-container">`;
        body += `<p>`;
            body += `<label style="padding-right:16px;">System</label>`;
            body += `<select class="w3-select w3-dark-gray w3-border-0" style="width:200px;">`
                body += `<option value="Any">Any</option>`;
                for(system in systems)
                {
                    let systemName = decodeURI(systems[system].name);
                    body += `<option value="${systems[system].name}">${systemName}</option>`;
                }
            body += `</select>`
        body += `</p>`;

        body += `<p>`;
            body += `<label>Title/Keyword</label>`;
            body += `<input class="w3-input w3-dark-gray w3-border-0" style="width:400px;" maxlength="128" type="text">`;
        body += `</p>`;
    body += `</form>`;
    

    html = html.replace(`\${BODY}`, body);

    res.send(html);
});