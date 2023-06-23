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
    "auth_method": {
        "mtls": 0,
        "private_key": 0,
        "notInformed": 0
    },
    "offline_as": {
        "qty": 0,
        "url": []
    }
}

const getDirectoryData = async function() {
    const res = await fetch('https://data.directory.openbankingbrasil.org.br/participants');
    const json = await res.json();
    return json;
}

const getUniqAuthorisationServerUrls = function(directoryData) {
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

        } catch (e) {
            results.offline_as.qty++;
            results.offline_as.url.push(authorisationServerUrls[i])
            console.log(authorisationServerUrls[i]);
            console.log(e);
        }
    }
}

const directoryData = await getDirectoryData();
const authorisationServerUrls = getUniqAuthorisationServerUrls(directoryData);
await analyseAuthorisationServerUrls(authorisationServerUrls);
console.log(results);