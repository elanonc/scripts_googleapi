const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

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

async function getDraftVersion(auth, packageName, editId) {
    try {
        const androidpublisher = google.androidpublisher({
            version: 'v3',
            auth: auth,
        });
        // Listar versões carregadas no rascunho.
        const bundles = await androidpublisher.edits.bundles.list({
            packageName: packageName,
            editId: editId,
        });
        
        const draftBundles = bundles.data.bundles || [];
        if (draftBundles.length > 0) {
            console.log('Versões em rascunho encontradas:', draftBundles);
            return true;
        } else {
            console.log('Nenhuma versão em rascunho encontrada.');
            return false;
        }
    } catch (err) {
        console.error('Erro ao obter versões em rascunho:', err);
        return false;
    }
}

async function publishDraft(auth, packageName, editId) {
    try {
        const androidpublisher = google.androidpublisher({
            version: 'v3',
            auth: auth,
        });
        // Publicar as alterações
        const response = await androidpublisher.edits.commit({
            packageName: packageName,
            editId: editId,
        });
        console.log('Publicação concluída:', response.data);
    } catch (err) {
        console.error('Erro ao publicar a edição:', err);
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
        const editId = await createEdit(auth, packageName);

        const hasDraft = await getDraftVersion(auth, packageName, editId);
        if (hasDraft) {
            console.log('Versão em rascunho encontrada. Publicando...');
            await publishDraft(auth, packageName, editId);
        } else {
            console.log('Nenhuma versão em rascunho encontrada. Nada para publicar.');
        }
    } catch (err) {
        console.error('Erro no fluxo principal:', err);
    }
}

main();
