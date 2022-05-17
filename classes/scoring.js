const AZ = {
    "exam" : [
        {
            "code": "AZ-104",
            "name": "Microsoft Azure Administrator",
            "provider":"Microsoft",
            "sections" : [
                {
                    "shortname": "Identity", "longname": "Manage Azure identies and governance"
                },
                {
                    "shortname": "Storage", "longname": "Implement and manage storage"
                },
                {
                    "shortname": "Compute", "longname": "Deploy and manage Azure compute resources"
                },
                {
                    "shortname": "Networking", "longname": "Configure and manage virtual networking"
                },
                {
                    "shortname": "Monitor", "longname": "Monitor and back up Azure resources"
                },
            ],
            "outline" : ["Candidates for this exam should have subject matter expertise implementing, managing, and monitoring an organization’s Microsoft Azure environment.",
                         "Responsibilities for this role include implementing, managing, and monitoring identity, governance, storage, compute, and virtual networks in a cloud environment, plus provision, size, monitor, and adjust resources, when needed.",
                         "An Azure administrator often serves as part of a larger team dedicated to implementing an organization's cloud infrastructure.",
                         "A candidate for this exam should have at least six months of hands-on experience administering Azure, along with a strong understanding of core Azure services, Azure workloads, security, and governance. In addition, this role should have experience using PowerShell, Azure CLI, Azure portal, and Azure Resource Manager templates."
                        ]
        },
        {
            "code": "AZ-204",
            "name": "Developing Solutions for Microsoft Azure",
            "provider":"Microsoft",
            "sections" : [
                {
                    "shortname": "Compute", "longname": "Develop Azure compute solutions"
                },
                {
                    "shortname": "Storage", "longname": "Develop for Azure storage"
                },
                {
                    "shortname": "Security", "longname": "Implement Azure security"
                },
                {
                    "shortname": "Monitor", "longname": "Monitor, troubleshoot, and optimize Azure solutions"
                },
                {
                    "shortname": "3rd party services", "longname": "Connect to and consume Azure services and third-party services"
                },
            ],
            "outline" : ["Candidates for this exam are cloud developers who participate in all phases of development from requirements definition and design to development, deployment, and maintenance. They partner with cloud DBAs, cloud administrators, and clients to implement solutions.",
                         "Candidates should be proficient in Azure SDKs, data storage options, data connections, APIs, app authentication and authorization, compute, and container deployment, debugging, performance tuning, and monitoring.",
                         "Candidates should have 1-2 years professional development experience and experience with Microsoft Azure. They should be able to program in an Azure-supported language, and should be proficient using Azure CLI, Azure PowerShell, and other tools.",
                         "NOTE: Most questions cover features that are general availability (GA). The exam may contain questions on Preview features if those features are commonly used."
                        ]
        },
        {
            "code": "AZ-500",
            "name": "Microsoft Azure Security Technologies",
            "provider":"Microsoft",
            "sections" : [
                {
                    "shortname": "Identity", "longname": "Manage identies and access"
                },
                {
                    "shortname": "Platform Protection", "longname": "Implement platform protection"
                },
                {
                    "shortname": "Security Operations", "longname": "Manage security operations"
                },
                {
                    "shortname": "Data and Apps", "longname": "Secure data and applications"
                }
            ],
            "outline":  ["Candidates for this exam should have subject matter expertise implementing Azure security controls that protect identity, access, data, applications, and networks in cloud and hybrid environments as part of an end-to-end infrastructure.",
                         "Responsibilities for an Azure security engineer include managing the security posture, identifying and remediating vulnerabilities, performing threat modeling, implementing threat protection, and responding to security incident escalations.",
                         "Azure security engineers often serve as part of a larger team to plan and implement cloud-based management and security.",
                         "Candidates for this exam should have practical experience in administration of Azure and hybrid environments. Candidates should have experience with infrastructure as code, security operations processes, cloud capabilities, and Azure services."
                        ]
        }
    ]
}

const internal = {};

module.exports = internal.Scoring = class {

    constructor(questionPool, ids, input) {
        
        this.questionPool = questionPool;
        this.ids = ids;
        this.input = input;
        this.code = questionPool.length > 0 ? questionPool[0].Exam : "";
        this.sectionScore = [];

        this.calculateScore();
    }

    calculateScore() {

        console.log("Scoring exam");

        let i, j, k;

        var sectionPts = [];
        var sectionMax = [];

        // Init the scoring per section to 0
        for (i = 0; i < AZ.exam.length; i++) if (AZ.exam[i].code == this.code) {
            for (j = 0; j < AZ.exam[i].sections.length; j++) {
                sectionPts.push(0);
                sectionMax.push(0);
            }
        }

        for (i = 0; i < this.ids.length; i++) {
        
          for (j = 0; j < this.questionPool.length; j++) if (this.questionPool[j].id == this.ids[i]) {
            let q = this.questionPool[j];
            let inp = this.input.inputs[i];
            let idx = this.getSectionIndex(q.KnowledgeArea);

            var points = 0;
            var maxpoints = 0;
    
            this.input.inputs[i].correct = [];
            for (k = 0; k < q.Questions.length; k++) {
              if (q.Questions[k].Correct == inp.answer[k]) points += q.Questions[k].Score;
              maxpoints += q.Questions[k].Score;
              this.input.inputs[i].correct.push(q.Questions[k].Correct);
            }
            this.input.inputs[i].points = points;
            this.input.inputs[i].maxpoints = maxpoints;
            sectionPts[idx] += points;
            sectionMax[idx] += maxpoints;
          }
        }

        // calculate the pct score for each section
        for (i = 0; i < sectionPts.length; i++) this.sectionScore.push(sectionMax[i] > 0 ? sectionPts[i]*100/sectionMax[i] : 100);
    }

    // return the index number for a given section shortname
    getSectionIndex(shortname) {
        let i, j;

        for (i = 0; i < AZ.exam.length; i++) if (AZ.exam[i].code == this.code) {
            for (j = 0; j < AZ.exam[i].sections.length; j++) {
                if (AZ.exam[i].sections[j].shortname == shortname) return j;
            }
        }

        return 0;
    }

    getScoredInput() {
        return this.input;
    }

    getPoints() {
        var pts = 0;
        for (i = 0; i < this.input.inputs.length; i++) pts += this.input.inputs[i].points;
        return pts;
    }

    getMaxPoints() {
        var pts = 0;
        for (i = 0; i < this.input.inputs.length; i++) pts += this.input.inputs[i].maxpoints;
        return pts;
    }

    getCorrect() {
        var c = 0;
        for (i = 0; i < this.input.inputs.length; i++) c += this.input.inputs[i].points == this.input.inputs[i].maxpoints ? 1 : 0;
        return c;
    }

    getLabelStr() {
        var labels = [];
        for (i = 0; i < AZ.exam.length; i++) if (AZ.exam[i].code == this.code) {
            for (j = 0; j < AZ.exam[i].sections.length; j++) labels.push(AZ.exam[i].sections[j].longname);
        }
        return labels;
    }

    getSectionScore() {
        return this.sectionScore;        
    }

    getTitle() {
        for (i = 0; i < AZ.exam.length; i++) 
            if (AZ.exam[i].code == this.code) 
                return this.code + " " + AZ.exam[i].name; 
        
        return "Error";
    }

    getScoreDetails() {
        var score = this.getMaxPoints() > 0 ? Math.round(this.getPoints()*1000/this.getMaxPoints()) : 0;

        var details = {
            "correct": this.getCorrect(),
            "incorrect": this.input.inputs.length - this.getCorrect(),
            "points" : this.getPoints(),
            "maxpoints" : this.getMaxPoints(),
            "score": score,
            "title": this.getTitle(),
            "message": score >= 700 ? "Congratulations, you passed the exam." : "We're sorry, you did not pass the exam.",
            "labels": this.getLabelStr(),
            "sectionScore" : this.getSectionScore()
        };

        return details;
    }

}

module.exports.getExamName = function(code) {
    for (i=0; i < AZ.exam.length; i++) if (AZ.exam[i].code == code) return AZ.exam[i].name;
    return "";
}

module.exports.getExamDetails = function(code) {
    for (i=0; i < AZ.exam.length; i++) if (AZ.exam[i].code == code) return AZ.exam[i];
    return {};
}
    
