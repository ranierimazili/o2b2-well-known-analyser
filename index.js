process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const results = {
    "pkce": {
        "allowed" : 0,
        "notAllowed": 0
    },
    "subject_type": {
        "public": 0,
        "pairwise": 0,
        "notInformed": 0
    },
    "response_modes": {
        "fragment": 0,
        "query": 0,
        "form_post": 0,
        "notInformed": 0
    },
    "response_types" : {
        "code_id_token": 0,
        "code": 0,
        "notInformed": 0
    },
    "auth_method": {
        "mtls": 0,
        "private_key": 0,
        "notInformed": 0
    },
    "offline_as": {
        "qty": 0,
        "url": []
    },
    "certifications" : {}
}

const getDirectoryData = async function() {
    const res = await fetch('https://data.directory.openbankingbrasil.org.br/participants');
    const json = await res.json();
    return json;
}

const getUniqueAuthorisationServerUrls = function(directoryData) {
    let authorisationServerUrls = directoryData.map(organisation => (
        organisation.AuthorisationServers.map(authorisationServer => authorisationServer.OpenIDDiscoveryDocument)
    ))
    
    //convert from nested array to flat array and delete null and duplicated urls
    authorisationServerUrls = authorisationServerUrls.flat();
    authorisationServerUrls = authorisationServerUrls.filter(url => url != null);
    authorisationServerUrls = [...new Set(authorisationServerUrls)];

    return authorisationServerUrls;
}

const checkPKCE = function(wellknown) {
    if (wellknown?.code_challenge_methods_supported) {
        results.pkce.allowed++;
    } else {
        results.pkce.notAllowed++;
    } 
}

const checkSubjectTypes = function(wellknown) {
    if (wellknown?.subject_types_supported?.includes("public")) {
        results.subject_type.public++;
    }
    if (wellknown?.subject_types_supported?.includes("pairwise")) {
        results.subject_type.pairwise++;
    }
    if (!wellknown?.subject_types_supported) {
        results.subject_type.notInformed++;
    }
}

const checkResponseTypes = function(wellknown) {
    if (wellknown?.response_types_supported?.includes("code id_token") || wellknown?.response_types_supported?.includes("id_token code")) {
        results.response_types.code_id_token++;
    }
    if (wellknown?.response_types_supported?.includes("code")) {
        results.response_types.code++;
    }
    if (!wellknown?.response_types_supported) {
        results.response_types.notInformed++;
    }
}

const checkResponseModes = function(wellknown) {
    if (wellknown?.response_modes_supported?.includes("fragment")) {
        results.response_modes.fragment++;
    }
    if (wellknown?.response_modes_supported?.includes("query")) {
        results.response_modes.query++;
    } 
    if (wellknown?.response_modes_supported?.includes("form_post")) {
        results.response_modes.form_post++;
    }
    if (!wellknown?.response_modes_supported) {
        results.response_modes.notInformed++;
    }
}

const checkAuthMethods = function(wellknown) {
    if (wellknown?.token_endpoint_auth_methods_supported?.includes("tls_client_auth")) {
        results.auth_method.mtls++;
    }
    if (wellknown?.token_endpoint_auth_methods_supported?.includes("private_key_jwt")) {
        results.auth_method.private_key++;
    }
    if (!wellknown?.token_endpoint_auth_methods_supported) {
        results.auth_method.private_key++;
    }
}

const analyseAuthorisationServerUrls = async function(authorisationServerUrls) {
    for (var i=0;i<authorisationServerUrls.length;i++) {
        console.log("Analysing #" + (i+1) + " from #" + authorisationServerUrls.length);
        try {
            const res = await fetch(authorisationServerUrls[i]);
            const wellknown = await res.json();

            checkPKCE(wellknown);
            checkSubjectTypes(wellknown);
            checkResponseModes(wellknown);
            checkAuthMethods(wellknown);
            checkResponseTypes(wellknown);

        } catch (e) {
            results.offline_as.qty++;
            results.offline_as.url.push(authorisationServerUrls[i])
            console.log(authorisationServerUrls[i]);
            console.log(e);
        }
    }
}

const analyseAuthorisationServerCertifications = function(directoryData) {
    for (var i=0;i<directoryData.length;i++) {
        for (var j=0;j<directoryData[i].AuthorisationServers.length;j++) {
            if (directoryData[i].AuthorisationServers[j].AuthorisationServerCertifications.length != 0) {
                const certification = getCurrentAuthorisationServerCertification(directoryData[i].AuthorisationServers[j].AuthorisationServerCertifications);
                const attrName = convertToyyyyMMdd(certification.CertificationExpirationDate).substr(0,4) + "_" + convertToyyyyMMdd(certification.CertificationExpirationDate).substr(4,2);
                if (!results.certifications.hasOwnProperty(attrName)) {
                    results.certifications[attrName] = 1;
                } else {
                    results.certifications[attrName]++;
                }
            }
        }
    }
}

const getCurrentAuthorisationServerCertification = function(certifications) {
    if (certifications.length == 1) {
        return certifications[0];
    } else {
        let pos = 0;
        for (var i=1;i<certifications.length;i++) {
            if (convertToyyyyMMdd(certifications[i].CertificationExpirationDate) > convertToyyyyMMdd(certifications[pos].CertificationExpirationDate)) {
                pos = i;
            }
        }
        return certifications[pos];
    }
}

const convertToyyyyMMdd = function(dateString) {
    var parts = dateString.split('/');
    var day = parts[0];
    var month = parts[1];
    var year = parts[2];
    var formattedDate = year + month + day;
    return formattedDate;
}

const directoryData = await getDirectoryData();
const authorisationServerUrls = getUniqueAuthorisationServerUrls(directoryData);
analyseAuthorisationServerCertifications(directoryData);
await analyseAuthorisationServerUrls(authorisationServerUrls);
console.log(results);