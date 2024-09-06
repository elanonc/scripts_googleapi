const { google } = require('googleapis');
const fs = require('fs');

// Configuração de file e escopo da aplicação utilizando key_file do service connection.
function getAuth(keyFile) {
    return new google.auth.GoogleAuth({
        keyFile: keyFile,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
}

async function createEdit(auth, packageName) {
    try {
        const androidpublisher = google.androidpublisher({
            version: 'v3',
            auth: auth,
        });
        const edit = await androidpublisher.edits.insert({
            packageName: packageName,
        });
        const editId = edit.data.id;
        console.log('Novo Edit ID:', editId);
        return editId;
    } catch (err) {
        console.error('Erro ao criar a edição:', err);
        throw err;
    }
}

async function getDraftVersion(auth, packageName, editId, track) {
    try {
        const androidpublisher = google.androidpublisher({
            version: 'v3',
            auth: auth,
        });
        const releases = await androidpublisher.edits.tracks.get({
            packageName: packageName,
            editId: editId,
            track: track
        });

        const draftReleases = (releases.data.releases || []).filter(release => release.status === 'draft');
        console.log(draftReleases);

        if (draftReleases.length > 0) {
            // Ordena as versões por versionCode
            draftReleases.sort((a, b) => b.versionCodes[0] - a.versionCodes[0]); // Assumindo que versionCodes é um array e queremos comparar os primeiros itens
            const latestDraftRelease = draftReleases[0];
            console.log('Última versão em draft encontrada:', latestDraftRelease);
            return latestDraftRelease;
        } else {
            console.log('Nenhuma versão em draft encontrada.');
            return null;
        }
    } catch (err) {
        console.error('Erro ao obter versões em draft:', err);
        return null;
    }
}

async function updateTrack(auth, packageName, editId, track, versionCode) {
    try {
        const androidpublisher = google.androidpublisher({
            version: 'v3',
            auth: auth,
        });

        // Obtém as informações atuais do track
        const trackData = await androidpublisher.edits.tracks.get({
            packageName: packageName,
            editId: editId,
            track: track
        });

        // Atualiza o status da versão selecionada
        const updatedReleases = trackData.data.releases.map(release => {
            if (release.versionCodes.includes(versionCode)) {
                return { ...release, status: 'completed' };
            }
            return release;
        });

        // Atualiza o track com as mudanças
        await androidpublisher.edits.tracks.update({
            packageName: packageName,
            editId: editId,
            track: track,
            requestBody: {
                releases: updatedReleases
            }
        });

        console.log('Status atualizado para completed.');

        // Faz o commit das alterações
        const commitResponse = await androidpublisher.edits.commit({
            packageName: packageName,
            editId: editId
        });

        console.log('Commit bem-sucedido:', commitResponse.data);
    } catch (err) {
        console.error('Erro ao atualizar o track:', err);
    }
}

async function main() {
    const keyFile = process.argv[2];
    const packageName = process.argv[3];
    const track = process.argv[4];
    
    if (!keyFile || !packageName || !track) {
        console.error('Uso: node script.js <keyFile> <packageName> <track>');
        process.exit(1);
    }

    try {
        const auth = getAuth(keyFile);
        const editId = await createEdit(auth, packageName);
        const latestDraftRelease = await getDraftVersion(auth, packageName, editId, track);

        if (latestDraftRelease) {
            console.log('Atualizando status da versão em draft...');
            await updateTrack(auth, packageName, editId, track, latestDraftRelease.versionCodes[0]);
        } else {
            console.log('Nenhuma versão em draft encontrada para atualizar.');
        }
    } catch (err) {
        console.error('Erro no fluxo principal:', err);
    }
}

main();
