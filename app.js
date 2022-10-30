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
let cached_changelog = ``;

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

function get_changelog(latest)
{
    let changelog = ``;

    changelog += `<div class="w3-container">`
    if(latest)
    {
        let lines = fs.readFileSync(`web/CHANGELOG.TXT`).toString().split(/\n/g);
        let headers = 0;
        for(line in lines)
        {
            if(lines[line].startsWith(`==`))
            {
                headers++;
                changelog += `</br>`
                if(headers >= 2 && latest) break;
            }
            changelog += `<p>${lines[line]}</p>`
        }
    }
    else
    {
        if(cached_changelog == ``)
        {
            let lines = fs.readFileSync(`web/CHANGELOG.TXT`).toString().split(/\n/g);
            for(line in lines)
            {
                if(lines[line].startsWith(`==`))
                {
                    changelog += `</br>`
                }

                changelog += `<p>${lines[line]}</p>`
            }
            cached_changelog = changelog
        }
        else
        {
            changelog = cached_changelog;
        }
    }
    changelog += `</div>`
    return changelog;
}

function get_tag(tag, args)
{
	for(let i = 0; i < args.length; ++i)
	{
		let temp = args[i].split("=");
		if (temp[0] == tag)
		{
			return temp[1];
		}
	}
}

function enumerate_directory(files)
{
    let body = ``;
    for(file in files)
    {
        body += `<li class="w3-hover-white">`
        body += `<a href="${create_shareable(files[file])}" style="display:inline;">${files[file].name.includes(`.7z`) ? files[file].name.slice(0, -3) : files[file].name}</a>`
        body += `<a class="w3-right" style="display:inline;">${prettify_bytes(files[file].size)}</a>`
        body += `</li>`
    }
    return body;
}

function not_ready()
{
    let body = ``;

    body += `<div class="w3-container">`
        body += `<h2>Data has yet to be cached...</h2>`
        body += `<p>Try again in a few seconds.</p>`
    body += `</div>`

    return body;
}

async function refresh_changelog()
{
    let data = await root_children[child].downloadBuffer();
    fs.writeFileSync(`web/CHANGELOG.TXT`, data.toString());
}

function refresh_repo()
{
    root_children = [];
    systems = [];
    total_size = 0;
    total_files = 0;
    cached_changelog = ``;

    repo.loadAttributes(async (err, file) =>
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
                if(root_children[child].name.includes(`CHANGELOG`))
                {
                    await refresh_changelog();
                }

                total_size += root_children[child].size;
                total_files++;
            }
        }

        systems.sort((a, b) =>
        {
            return a.name.localeCompare(b.name);
        });

        ready = true;

        if(ready)
        {
            console.log(`Cache is ready!`);
        }
        else
        {
            console.log(`Cache failed to load!`);
        }

        setTimeout(refresh_repo, (1000 * 60) * 60);
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
    let changelog = get_changelog(true);

    body += `<div class="w3-container">`
        body += `<h1>Debugging.Games</h1>`
        body += `<h3>Your friendly repository filled with tons of applcation data!</h3>`
        body += `<p>\${TOTAL_SIZE} across \${TOTAL_FILES} files</p>`
        body += `<p>Binary data from <a href="/systems">\${TOTAL_SYSTEMS} different systems</a></p>`
        body += `<br>`
        body += `<br>`
        body += `<h1 style="display:inline-block;padding-right:16px">Changelog</h1>`
        body += `<a href="/changelog" style="display:inline-block;font-size:12px;">View full changelog</a>`
        body += `<br>`
        body += `\${CHANGELOG}`
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

    body += `<div class="w3-container">`
        body += `<h1>Systems</h1>`
    body += `</div>`

    if(ready)
    {
        body += `<div class="w3-container" style="width:300px;">`
            body += `<ul class="w3-ul w3-border">`
                for(system in systems)
                {
                    let color = `class="`
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

                    body += `<li ${color}> <a href="/systems/${systems[system].name}">${systems[system].name} </a> </li>`
                    color = ``
                }
            body += `</ul>`
        body += `</div>`
    }
    else
    {
        body += not_ready();
    }

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

    body += `<div class="w3-container">`
        body += `<h1>${system} (\${ENTRIES} entires)</h1>`
    body += `</div>`

    body += `<div class="w3-container">`
        body += `<ul class="w3-ul w3-border-bottom">`
            body += enumerate_directory(files);
        body += `</ul>`
    body += `</div>`

    body = body.replace(`\${ENTRIES}`, `${files.length}`);
    html = html.replace(`\${BODY}`, body);

    res.send(html);
});

http.get('/search', (req, res) =>
{
    let html = `${html_template()}`;
    let body = ``;
    let args = [];
    let entires = 0;

    if(req.url.split('?').length > 1)
    {
        args = req.url.split('?')[1].split('&');
    }

    body += `<div class="w3-container">`
        body += `<h1>Search</h1>`
    body += `</div>`

    if(ready && args.length <= 0)
    {
        body += `<form class="w3-container" action="/search">`

            body += `<label style="padding-right:16px;" for="system">System</label>`
            body += `<select class="w3-select w3-dark-gray w3-border-0" style="width:200px;" id="system" name="system">`
                body += `<option value="Any">Any</option>`
                for(system in systems)
                {
                    let systemName = decodeURI(systems[system].name);
                    body += `<option value="${systems[system].name}">${systemName}</option>`
                }
            body += `</select>`

            body += `<br>`
            body += `<br>`
            
            body += `<label style="padding-right:16px;" for="keywords">Title/Keyword</label>`
            body += `<input class="w3-input w3-dark-gray w3-border-0" style="width:400px;" maxlength="128" minlength="1" type="text" autocomplete="off" id="keywords" name="keywords">`

            body += `<br>`
            
            body += `<input class="w3-btn w3-dark-gray" type="submit" value="Search"></input>`

        body += `</form>`
    }
    else if(ready && args.length > 0)
    {
        let system = decodeURI(get_tag(`system`, args));
        let keywords = decodeURI(get_tag(`keywords`, args)).replace(/\+/g, ` `);

        if(keywords == undefined || keywords == `` || keywords.length <= 0)
        {
            body += `<div class="w3-container">`
                body += `<h2>Error</h2>`
                body += `<p>Search must contain at least 1 character!</p>`
            body += `</div>`
        }
        else
        {
            body += `<div class="w3-container">`
                body += `<h2>${system} : ${keywords} (\${ENTIRES} entires)</h2>`
            body += `</div>`

            if(system == "Any")
            {
                body += `<div class="w3-container">`
                    body += `<ul class="w3-ul w3-border-bottom">`
                    for(child in root_children)
                    {
                        if(root_children[child].directory)
                        {
                            for(childChild in root_children[child].children)
                            {
                                if(root_children[child].children[childChild].name.toLowerCase().includes(keywords.toLowerCase()))
                                {
                                    body += `<li class="w3-hover-white">`
                                    body += `<a href="${create_shareable(root_children[child].children[childChild])}" style="display:inline;">${root_children[child].children[childChild].name.includes(`.7z`) ? root_children[child].children[childChild].name.slice(0, -3) : root_children[child].children[childChild].name}</a>`
                                    body += `<a class="w3-right" style="display:inline;">${prettify_bytes(root_children[child].children[childChild].size)}</a>`
                                    body += `</li>`
                                    ++entires;
                                }
                            }
                        }
                    }
                    body += `</ul>`
                body += `</div>`
            }
            else
            {
                body += `<div class="w3-container">`
                    body += `<ul class="w3-ul w3-border-bottom">`
                    for(child in root_children)
                    {
                        if(root_children[child].name == system && root_children[child].directory)
                        {
                            for(childChild in root_children[child].children)
                            {
                                if(root_children[child].children[childChild].name.toLowerCase().includes(keywords.toLowerCase()))
                                {
                                    body += `<li class="w3-hover-white">`
                                    body += `<a href="${create_shareable(root_children[child].children[childChild])}" style="display:inline;">${root_children[child].children[childChild].name.includes(`.7z`) ? root_children[child].children[childChild].name.slice(0, -3) : root_children[child].children[childChild].name}</a>`
                                    body += `<a class="w3-right" style="display:inline;">${prettify_bytes(root_children[child].children[childChild].size)}</a>`
                                    body += `</li>`
                                    ++entires;
                                }
                            }
                        }
                    }
                    body += `</ul>`
                body += `</div>`
            }
        }

        body = body.replace(`\${ENTIRES}`, `${entires}`);
    }
    else
    {
        body += not_ready();
    }

    html = html.replace(`\${BODY}`, body);

    res.send(html);
});

http.get([`/changelog`, `/changelog/`], (req, res) =>
{
    let html = `${html_template()}`;
    let body = ``;
    let changelog = get_changelog(false);

    body += `<div class="w3-container">`
        body += `<h1>Changelog</h1>`
    body += `</div>`

    body += `${changelog}`

    html = html.replace(`\${BODY}`, body);

    res.send(html);
});

http.get([`/contribute`, `/contribute/`], (req, res) =>
{
    let html = `${html_template()}`;
    let body = ``;
    
    body += `<div class="w3-container">`
        body += `<h1>Contribute</h1>`
    body += `</div>`

    body += `<div class="w3-container">`

        body += `<h3>- Found some neat symbols and want to submit them to the repo?</h3>`
        body += `<p>`
            body += `: Contributions can be submitted either through the <a href="https://discord.gg/QH3qqDMjKx" style="text-decoration:underline;">discord</a> in the #submissions channel `
            body += `or anonymously through the <a href="https://mega.nz/megadrop/xZX7TVhGKmw" style="text-decoration:underline;">MEGAdrop</a>`
        body += `</p>`

        body += `<br>`

        body += `<h3>- Noticed an error that we embarassingly didn't?</h3>`
        body += `<p>`
            body += `: Edits can be documented through the <a href="https://discord.gg/QH3qqDMjKx" style="text-decoration:underline;">discord</a> in the #errata-reporting channel. `
            body += `there is currently no anonymous solution, sorry!`
        body += `</p>`

        body += `<br>`

        body += `<h3>- Want to know how to find debug symbols?</h3>`
        body += `<p>`
            body += `Windows : Some developers will forget to remove their .pdb files from their release builds. `
            body += `Anyone can easily go to their application directory and notice if a pdb exists because usually its right next to the main exe file.`
            body += `<br>`
            body += `If you don't immediately see a .pdb file, you can do a quick search of "*.pdb" in the applications's directory`
            body += `<br>`
            body += `A more rare but potentially possible file to find are "*.map" files`
            body += `<br>`
            body += `Some exes themselves will also contain debug symbols if the develop forgot to strip the debug information when compiling!`
            body += `<br>`
            body += `<br>`
            body += `Linux : TODO`
            body += `<br>`
            body += `<br>`
            body += `Mac : TODO`
        body += `</p>`

    body += `</div>`

    html = html.replace(`\${BODY}`, body);

    res.send(html);
});

http.use((req, res) =>
{
    let html = `${html_template()}`;
    let body = ``;

    body += `<div class="w3-container">`
        body += `<h1>404</h1>`;
        body += `<p>The symbols are in another castle!</p>`;
    body += `</div>`

    html = html.replace(`\${BODY}`, body);

    res.status(404);
    res.send(html);
});