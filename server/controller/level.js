import { ObjectId } from "mongodb";
import { getDb } from "../db/conn.js";
import { arrayStringToObjectId } from "../utils/mongoUtils.js";

export async function getLevels(req, res) {
    let db_connect = getDb("runtime-hunter");
    db_connect.collection("courses")
        .find({ "_id": req.params.courseId }).toArray()
        .then((result) => {
            res.json(result.levels);
        })
        .catch((err) => {
            throw err;
        });
}
export async function getLevel(req, res) {
    let db_connect = getDb("runtime-hunter");

    db_connect.collection("courses")
        .findOne({ "_id": ObjectId(req.params.courseId), "levels.levelId": req.params.levelId })
        .then((result) => {
            var level;
            
            for (let i = 0; i < result.levels.length; i++) {
                if ((result.levels[i].levelId).toString() == req.params.levelId) {
                    level = result.levels[i];
                }
            }
            res.json(level);
        })
        .catch((err) => {
            throw err;
        });
}
export async function addLevel(req, res) {
    let db_connect = getDb("runtime-hunter");

    let level = {
        levelId: ObjectId().toString(),
        levelName: req.body.levelName,
        levelDescription: req.body.levelDescription,
        levelSolution: req.body.levelSolution,
        levelIndex: req.body.levelIndex,
        codeCpp: req.body.codeCpp,
        codePy: req.body.codePy,
        difficulty: req.body.difficulty,
        testCases: req.body.testCases ? req.body.testCases : [],
        levelTags: req.body.levelTags,
    };

    db_connect.collection("courses")
        .findOne({
            "_id": ObjectId(req.body.courseId),
            "levels.levelName": req.body.levelName
        })
        .then(result => {
            if (!result) {
                db_connect.collection("courses").findOne({ "_id": ObjectId(req.body.courseId) }, function (req1, res1) {
                    var levels = res1.levels ? res1.levels : [];
                    (req.body.levelIndex > levels.length + 1) ?
                        levels.splice(levels.length, 0, level) :
                        levels.splice(req.body.levelIndex, 0, level)

                    db_connect.collection("courses").updateOne({ "_id": ObjectId(req.body.courseId) }, { $set: { "levels": levels } }, function (err, response) {
                        if (err)
                            throw err;
                        return res.json({ message: "Successfully created level" });
                    });
                });
            }
            else {
                return res.json({ message: 'This level has already been created!' });
            }
        })
        .catch((err) => {
            throw err;
        });

}
export async function bulkGetLevels(req, res) {
    let db_connect = getDb("runtime-hunter");
    let levelIds = req.body.levelIds ?? [];

    levelIds = arrayStringToObjectId(levelIds);
    db_connect.collection("courses").find({ "levels.levelId": { $in: levelIds } }).toArray().then(courses => {

        let levels = [];

        for (let i = 0; i < courses.length; i++) {

            for (let j = 0; j < courses[i].levels.length; j++) {
                
                let courseLevels = courses[i].levels;
                for (let k = 0; k < levelIds.length; k++) {
                   
                    if (levelIds[k].toString() === courseLevels[j].levelId.toString()) {
                    
                        levels.push({
                            "levelId": courseLevels[j].levelId,
                            "levelName": courseLevels[j].levelName,
                            "difficulty": courseLevels[j].difficulty,
                        });
                    }
                }
            }
        }
        return res.json(levels);

    });
}

export async function deleteLevel(req, res){
    let db_connect = getDb("runtime-hunter");

    db_connect.collection("courses")
    .updateOne({
        "_id": ObjectId(req.body.courseId),
    }, {$pull: { levels: { "levelId": req.body.levelId } } },  
       {multi: true} )
    .then((result) => {
        return res.json({ message: 'Deleted level succesfully' });
    })
    .catch((err) => {
        console.log("err: ", err);
        throw err;
    });
}

export async function updateLevel(req, res){
    let db_connect = getDb("runtime-hunter");
    // // create a filter 
    // const filter = { "_id": ObjectId(req.body.courseId), "levels.levelId": req.body.levelId };

    // // this option instructs the method to create a document if no documents match the filter
    // const options = { upsert: false };

    // create a document 
    // const updateDoc = {
    //     $set: {
    //     levelName: req.body.levelName,
    //     levelTags: req.body.levelTags,
    //     levelDescription: req.body.levelDescription,
    //     levelSolution: req.body.levelSolution,
    //     difficulty: req.body.difficulty,
    //     levelIndex: req.body.levelIndex,
    //     codeCpp: req.body.codeCpp,
    //     codePy: req.body.codePy,
    //     },

    // };

    // const dataToBeUpdated = {
    //     "levels.levelName": req.body.levelName,
    //     "levels.levelTags": req.body.levelTags,
    //     "levels.levelDescription": req.body.levelDescription,
    //     "levels.levelSolution": req.body.levelSolution,
    //     "levels.difficulty": req.body.difficulty,
    //     "levels.levelIndex": req.body.levelIndex,
    //     "levels.codeCpp": req.body.codeCpp,
    //     "levels.codePy": req.body.codePy,
    // }

    const updateDoc =  {
        $set: {
            "levels.$.levelName": req.body.levelName,
            "levels.$.levelTags": req.body.levelTags,
            "levels.$.levelDescription": req.body.levelDescription,
            "levels.$.levelSolution": req.body.levelSolution,
            "levels.$.difficulty": req.body.difficulty,
            "levels.$.levelIndex": req.body.levelIndex,
            "levels.$.codeCpp": req.body.codeCpp,
            "levels.$.codePy": req.body.codePy
        }
    }

    const filter = { "levels.levelId":req.body.levelId }
    // const conditionFilters = {
    //     arrayFilters: [
    //             { 'e1.showByDate.shows': { '$exists': true } },
    //             { 'e2.showSeats': { '$exists': true } },
    //             { 'e3.seat_status': false }
    //         ]
    // }
    console.log("updatedDoc", updateDoc);
    db_connect.collection("courses")
    .updateOne(filter, updateDoc)
    .then(result => {
        console.log("res:", result)
        return res.json({ message: 'Successfully updated level' })
    })
    .catch(err => {
        console.log("err", err)
        return err;
    })
}