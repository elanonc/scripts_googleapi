const { google } = require('googleapis');

// Configuração de file e escopo da aplicação utilizando key_file do service connection.
function getAuth(keyFile) {
    return new google.auth.GoogleAuth({
        keyFile: keyFile,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
}

async function getCompletedVersions(auth, packageName) {
    try {
        const androidpublisher = google.androidpublisher({
            version: 'v3',
            auth: auth,
        });

        // Cria uma edição temporária para acessar as informações
        const editResponse = await androidpublisher.edits.insert({
            packageName: packageName,
        });
        const editId = editResponse.data.id;

        // Obtém o track 'internal'
        const trackResponse = await androidpublisher.edits.tracks.get({
            packageName: packageName,
            editId: editId,
            track: 'internal', // Track 'internal'
        });

        const releases = trackResponse.data.releases || [];
        const completedReleases = releases.filter(release => release.status === 'completed');

        if (completedReleases.length > 0) {
            console.log('Versões com status "completed" no track "internal":');
            completedReleases.forEach(release => {
                console.log(`Versão: ${release.versionCodes}`);
                console.log(`Status: ${release.status}`);
            });
        } else {
            console.log('Nenhuma versão com status "completed" encontrada no track "internal".');
        }
    } catch (err) {
        console.error('Erro ao obter versões com status "completed":', err);
    }
}

async function main() {
    const keyFile = process.argv[2];
    const packageName = process.argv[3];

    if (!keyFile || !packageName) {
        console.error('Uso: node script.js <keyFile> <packageName>');
        process.exit(1);
    }

    try {
        const auth = getAuth(keyFile);
        await getCompletedVersions(auth, packageName);
    } catch (err) {
        console.error('Erro no fluxo principal:', err);
    }
}

main();
