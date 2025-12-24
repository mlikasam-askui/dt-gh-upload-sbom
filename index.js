const fs = require('fs');
const core = require('@actions/core');

async function run() {
  try {
    const serverUrl = core.getInput('serverUrl');
    const apiKey = core.getInput('apikey');
    const project = core.getInput('project');
    const projectName = core.getInput('projectname');
    const projectVersion = core.getInput('projectversion');
    const projectTags = core.getInput('projecttags');
    const autoCreate = core.getInput('autocreate') !== 'false';
    const bomFilename = core.getInput('bomfilename');
    const parent = core.getInput('parent');
    const parentName = core.getInput('parentname');
    const parentVersion = core.getInput('parentversion');
    const isLatestProjectVersion = core.getInput('isLatestProjectVersion') !== 'true';

    if (project === "" && (projectName === "" || projectVersion === "")) {
      throw 'project or projectName + projectVersion must be set'
    }

    if (!autoCreate && project === "") {
      throw 'project can\'t be empty if autoCreate is false'
    }

    if (project === "" && (projectName === "" || projectVersion === "")) {
      throw 'project or projectName + projectVersion must be set'
    }

    if ((parentName === "" && parentVersion !== "") || (parentName !== "" && parentVersion === "")) {
      throw 'parentName + parentVersion must both be set'
    }

    core.info(`Reading BOM: ${bomFilename}...`);
    const bomContents = fs.readFileSync(bomFilename);
    let encodedBomContents = Buffer.from(bomContents).toString('base64');
    if (encodedBomContents.startsWith('77u/')) {
      encodedBomContents = encodedBomContents.substring(4);
    }

    let bomPayload;
    if (autoCreate) {
      bomPayload = {
        projectName: projectName,
        projectVersion: projectVersion,
        autoCreate: autoCreate,
        bom: encodedBomContents
      }
      if (projectTags) {
        bomPayload.projectTags = projectTags.split(',').map(tag => ({name: tag.trim()}));
      }
    } else {
      bomPayload = {
        project: project,
        bom: encodedBomContents
      }
    }

    if (parent && parent.trim().length > 0) {
      bomPayload.parentUUID = parent;
    } else if (parentName && parentName.trim().length > 0 && parentVersion && parentVersion.trim().length > 0) {
      bomPayload.parentName = parentName;
      bomPayload.parentVersion = parentVersion;
    }

    if (isLatestProjectVersion) {
      bomPayload.isLatestProjectVersion = isLatestProjectVersion;
    }

    const postData = JSON.stringify(bomPayload);

    const requestOptions = {
      method: 'PUT',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: postData
    };


    core.info(`Uploading to Dependency-Track server ${serverUrl}...`);
    const response = await fetch(serverUrl, requestOptions);

    if (response.ok) {
      core.info('Finished uploading BOM to Dependency-Track server.');
    } else {
      const responseBody = await response.text();
      if (responseBody) {
        core.error(responseBody);
      }
      core.setFailed('Failed response status code:' + response.status);
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
