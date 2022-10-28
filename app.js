const http = require('http');
const { File } = require(`megajs`);

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

(async function()
{
    repo.loadAttributes((err, file) =>
    {
        if(err)
        {
            console.error(err.message);
            return;
        }
        
        root_children = file.children;
        root_children.sort((a, b) => 
        {
            if(a.directory)
            {
                return a.name.localeCompare(b.name);
            }
        });

        ready = true;
    });

    http.createServer((req, res) =>
    {
        switch(req.method)
        {
            case `GET`:
                
                if(!ready)
                {
                    res.writeHead(200);
                    res.end("Not ready...");
                    return;
                }

                let total_files = 0;
                let final = ``;
                final += `<html>`;
                final += `<head>`;
                final += `<link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">`;
                final += `</head>`;

                final += `<h1> Total Files: \${TOTAL_FILES}`

                final += `<ul>`;
                for(child in root_children)
                {
                    final += `<li>`;
                    if(root_children[child].directory)
                    {
                        final += `<a href="${create_shareable(root_children[child])}">${root_children[child].name}/</a>`;

                        final += `<ul>`;
                        for(childChild in root_children[child].children)
                        {
                            if(!root_children[child].children[childChild].directory)
                            {
                                final += `<li>`;
                                final += `<a href="${create_shareable(root_children[child].children[childChild])}">${root_children[child].children[childChild].name}/</a>`;
                                final += `</li>`;
                                total_files++;
                            }
                        }
                        final += `</ul>`;
                    }
                    else
                    {
                        final += `<a href="${create_shareable(root_children[child])}">${root_children[child].name}</a>`;
                        total_files++;
                    }
                    final += `</li>`;
                }
                final += `</ul>`;
                final += `</html>`;

                final = final.replace("${TOTAL_FILES}", `${total_files}`);

                res.writeHead(200);
                res.end(final);
                break;
        }
    }).listen(80, `0.0.0.0`);
})();