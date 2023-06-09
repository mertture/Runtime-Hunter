import CodeEditor from "@uiw/react-textarea-code-editor";
import axios from "axios";
import { encode as base64_encode } from "base-64";
import React, { useCallback, useEffect, useState } from "react";
import { Button, Col, Container, Row } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import Select from "react-select";
import { useStore } from "../../store/store";
import Header from "../header/header";
import { languageOptions } from "./languageOptions";
import "./question-page.css";
import Canvas2 from "../../components/canvas/canvas";



function QuestionPage() {
  const [state] = useStore();
  const { user: currentUser } = state;
  
  const [totalTime, setTotalTime] = useState(10);
  const [numberOfTestcases, setNumberOfTestCases] = useState(5);
  const [testCaseTimes, setTestCaseTimes] = useState([1, 1, 1, 1, 6])
  const [failedTestCase, setFailedTestCase] = useState(-1);
  const [gameArray, setGameArray] = useState([]);
  const [gameStory, setGameStory] = useState([]);
  const array = ["apple", "banana", "orange"];

  const navigate = useNavigate();

  const { courseId, levelId } = useParams();

  const [lang, setLang] = useState(
    languageOptions[0]
  );

  const [question, setQuestion] = useState();
  const [code, setCode] = useState(
    lang ? (localStorage.getItem(`${courseId}-${levelId}-${lang.value}`) ? localStorage.getItem(`${courseId}-${levelId}-${lang.value}`) : (question ? question.codeCpp : lang.default)) : languageOptions[0].default
  );

  const [submissionHistory, setSubmissionHistory] = useState([])

  function changeLang(language) {
    setLang(language);
    setCode(localStorage.getItem(`${courseId}-${levelId}-${language.value}`) ? localStorage.getItem(`${courseId}-${levelId}-${language.value}`) : (language.value === "python" ? question.codePy : question.codeCpp));
  }

  function saveCode(code) {
    setCode(code);
    localStorage.setItem(`${courseId}-${levelId}-${lang.value}`, code);
  }

  function clearLocalStorage() {
    if (courseId && levelId && lang) {
      localStorage.removeItem(`${courseId}-${levelId}-${lang.value}`)
      setCode(lang.value === "python" ? question.codePy : question.codeCpp)
    }
  }

  const fetchLevel = useCallback(
    async () => {
      if (courseId && levelId) {
        await axios
          .get(`${process.env.REACT_APP_URL}/api/level/${courseId}/${levelId}`)
          .then((res) => {
            if (res.data !== null) {
              console.log(res.data);
              setQuestion(res.data);
            }
            else {
              navigate("/error");
            }
          })
          .catch((err) => {
            console.log("Error:", err);
          })
      }
    },
    [courseId, levelId],
  )

  useEffect(() => {
    fetchLevel();
  }, [levelId])

  useEffect(() => {
    getSubmissionHistory();
  }, [levelId])

  useEffect(() => {
    if (question) {
      setCode((lang.value == "python") ? question.codePy : question.codeCpp)
    }
  }, [question])


  async function getTestcases() {

    const testcases = await axios.get(`${process.env.REACT_APP_URL}/api/testcase/${courseId}/${levelId}`,).then(res => {
      if (res.data !== null) {
        return res.data;
      }
      else {
        navigate("/error");
      }
    }).catch(err => console.log(err))

    return testcases;
  }


  async function getSubmissionHistory() {

    const req_body = {
      userId: currentUser._id,
      levelId: levelId,
    }
    await axios.post(`${process.env.REACT_APP_URL}/api/submission/userquestion`, req_body)
      .then(res => {
        console.log("Submission History", res.data)
        const sub_data = res.data
        sub_data.sort((a, b) => (a.timeSubmitted < b.timeSubmitted) ? 1 : -1)
        setSubmissionHistory(sub_data)
      })
      .catch(err => {
        console.log("Error while getting earlier submissions", err)
      })
  }

  async function submit() {
    let testcases = await axios.get(`${process.env.REACT_APP_URL}/api/testcase/${courseId}/${levelId}`);
    testcases = testcases.data;

    let results = [];

    for (let i = 0; i < testcases.length; i++) {
      const formData = {
        "language_id": lang.id,
        "source_code": base64_encode(code),
        ...(testcases[i].input !== "" && { "stdin": base64_encode(testcases[i].input) }),
      };

      const response = await fetch(
        process.env.REACT_APP_RAPID_API_URL + "?base64_encoded=true",
        {
          method: "POST",
          headers: {
            "x-rapidapi-host": process.env.REACT_APP_RAPID_API_HOST,
            "x-rapidapi-key": process.env.REACT_APP_RAPID_API_KEY,
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(formData),
        }
      );
      const jsonResponse = await response.json();

      const submissionResult = await fetch(
        process.env.REACT_APP_RAPID_API_URL + "/" + jsonResponse.token,
        {
          method: "GET",
          headers: {
            "x-rapidapi-host": process.env.REACT_APP_RAPID_API_HOST,
            "x-rapidapi-key": process.env.REACT_APP_RAPID_API_KEY,
          },
        }
      );

      const subResult = await submissionResult.json();

      let resultOutput = subResult.stdout.trim()
      const testcaseStatus = resultOutput === testcases[i].output.trim() ? true : false;

      results.push({
        testcase: testcases[i],
        userOutput: resultOutput,
        status: testcaseStatus,
        runtime: subResult.time,
      });

    }

    let submission = {
      userId: currentUser._id,
      courseId: courseId,
      levelId: levelId,
      timeSubmitted: new Date(Date.now()).toISOString(),
      testcases: results,
      language: lang,
    };

    await axios.post(
      `${process.env.REACT_APP_URL}/api/submission`,
      submission,
    )
      .then(subRes => {
        console.log("Added submission to db", subRes)
      })
      .catch(err => {
        console.log("Error while adding submission to db", err)
      })
  }

  function findGameArray()
  {
    const monsterAttackTime = totalTime / numberOfTestcases;
    let result = [];
    let currentTotalTime = 0;
    let monsterAttackCount = 0;
    let gameStoryGenerator = [];
    for (let index = 0; index < numberOfTestcases; index++) {
      monsterAttackCount = Math.floor(currentTotalTime / monsterAttackTime);
      // console.log("before adding: ", monsterAttackCount, Math.floor(currentTotalTime / monsterAttackTime));
      currentTotalTime += testCaseTimes[index];
      if (currentTotalTime > totalTime) {
        result.push(-1);
        break;
      }
      // console.log("after adding: ", monsterAttackCount, Math.floor(currentTotalTime / monsterAttackTime));
      
      if(Math.floor(currentTotalTime / monsterAttackTime) > monsterAttackCount)
      {
        for (let i = 0; i < Math.floor(currentTotalTime / monsterAttackTime) - monsterAttackCount; i++) {
          monsterAttackCount++;
          gameStoryGenerator.push(`Monster attacks you after ${monsterAttackCount * monsterAttackTime} seconds.`)
          result.push(-1);
        }
      }
      result.push(1);
      gameStoryGenerator.push(`You solved testcase ${index + 1} in ${testCaseTimes[index]} seconds.`)
    }
    console.log("result is here: ", gameStoryGenerator);

    return result;
  }
  
  function findGameStory()
  {
    const monsterAttackTime = totalTime / numberOfTestcases;
    let result = [];
    let currentTotalTime = 0;
    let monsterAttackCount = 0;
    let gameStoryGenerator = [];
    for (let index = 0; index < numberOfTestcases; index++) {
      monsterAttackCount = Math.floor(currentTotalTime / monsterAttackTime);
      // console.log("before adding: ", monsterAttackCount, Math.floor(currentTotalTime / monsterAttackTime));
      currentTotalTime += testCaseTimes[index];
      if (currentTotalTime > totalTime) {
        result.push(-1);
        break;
      }
      // console.log("after adding: ", monsterAttackCount, Math.floor(currentTotalTime / monsterAttackTime));
      
      if(Math.floor(currentTotalTime / monsterAttackTime) > monsterAttackCount)
      {
        for (let i = 0; i < Math.floor(currentTotalTime / monsterAttackTime) - monsterAttackCount; i++) {
          monsterAttackCount++;
          gameStoryGenerator.push(`Monster attacks you after ${monsterAttackCount * monsterAttackTime} seconds.`)
          result.push(-1);
        }
      }
      result.push(1);
      gameStoryGenerator.push(`You solved testcase ${index + 1} in ${testCaseTimes[index]} seconds.`)
    }
    console.log("result is here: ", gameStoryGenerator);

    return gameStoryGenerator;
  }

  return (
    <div>
      <Header />
      <Container
        fluid
      >
        <Row style={{ padding: "10px", overflow: "hidden" }}>
          <Col
            style={{ height: "600px", overflow: "scroll" }}
            xs={6}
          >
            <div>
              <nav>
                <div
                  className="nav nav-tabs"
                  id="nav-tab"
                  role="tablist"
                >
                  <button
                    className="nav-link active"
                    id="nav-desc-tab"
                    data-bs-toggle="tab"
                    data-bs-target="#nav-desc"
                    type="button"
                    role="tab"
                    aria-controls="nav-desc"
                    aria-selected="true"
                    color='red'
                  >Description
                  </button>
                  <button
                    className="nav-link"
                    id="nav-solution-tab"
                    data-bs-toggle="tab"
                    data-bs-target="#nav-solution"
                    type="button"
                    role="tab"
                    aria-controls="nav-solution"
                    aria-selected="false"
                  >Solution
                  </button>
                  <button
                    className="nav-link"
                    id="nav-submission-tab"
                    data-bs-toggle="tab"
                    data-bs-target="#nav-submission"
                    type="button"
                    role="tab"
                    aria-controls="nav-submission"
                    aria-selected="false"
                  >Submissions
                  </button>
                </div>
              </nav>
              <div
                className="tab-content"
                id="nav-tabContent"
              >
                <div
                  className="tab-pane fade show active"
                  id="nav-desc"
                  role="tabpanel"
                  aria-labelledby="nav-desc-tab"
                >
                  <div
                    style={{ width: "100%", height: "85%", padding: "8px" }}
                    disabled
                  >
                    <h4>
                      {question ? question.levelName : ""}
                    </h4>
                    {question ?
                      (question.difficulty === "easy" ?
                        <h6
                          style={{ color: "green" }}
                        >
                          Easy
                        </h6> : question.difficulty === "medium" ?
                          <h6 style={{ color: "orange" }}>
                            Medium
                          </h6> :
                          <h6 style={{ color: "red" }}>
                            Hard
                          </h6>) : ""}

                    <hr
                      className="solid"
                    />
                    {/* <div style={{ whiteSpace: "normal" }}>{question ? question.levelDescription : ""}</div> */}
                    {question ? <div
                      className="codeBlock"
                      dangerouslySetInnerHTML={{ __html: question.levelDescription }}
                    /> : ""}
                  </div>
                </div>
                <div
                  className="tab-pane fade"
                  id="nav-solution"
                  role="tabpanel"
                  aria-labelledby="nav-solution-tab"
                >
                  {/* <h3>{question.levelSolution}</h3> */}
                  {question ? <div
                    className="codeBlock"
                    dangerouslySetInnerHTML={{ __html: question.levelSolution }}
                  /> : ""}
                </div>
                <div
                  className="tab-pane fade"
                  id="nav-submission"
                  role="tabpanel"
                  aria-labelledby="nav-submission-tab"
                >
                  <div>

                    {submissionHistory.length > 0 ?
                      <table className='submissons-table'>
                        <thead>

                          <tr>
                            <th>Submission Time</th>
                            <th>Status</th>
                            <th>Testcases</th>
                            {/* <th>Runtime</th> */}
                            <th>Language</th>
                          </tr>
                        </thead>
                        <tbody>

                          {submissionHistory.map(sub => SubmissionRow(sub))}

                        </tbody>

                      </table> : <h6 style={{ marginTop: "25px" }}>You have no previous submission...</h6>

                    }

                  </div>
                </div>
              </div>

            </div>

          </Col>
          <Col
            style={{ height: "88%", marginTop: "6%" }}
            className={"questionPageDivider"}
            xs={1}
          >

          </Col>
          <Col
            style={{ overflow: "hidden" }}
            xs={5}
          >
            <LanguagesDropdown
              onSelectChange={changeLang}
            />
            {/* <dark-mode
              light="Light"
              style={{ position: "fixed", top: 8, left: 10 }}
            >
            </dark-mode> */}
            <div
              className="App-editor"
              data-color-mode="light"
            >
              <CodeEditor
                autoFocus
                value={code}
                language={lang.value}
                onChange={(evn) => saveCode(evn.target.value)}
                padding={15}
                minHeight={"480px"}
                minLength={"400px"}
                style={{
                  overflowWrap: "breakWord",
                  fontSize: "14",
                  fontFamily: "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
                }}
              />
            </div>
            <Row>
              <Col>
                <Button
                  style={{ marginTop: "10px", }}
                  onClick={clearLocalStorage}
                >Clear code
                </Button>
              </Col>
              <Col>
                <Button
                  style={{ marginTop: "10px", display: "flex", marginLeft: "auto" }}
                  onClick={submit}
                >Compile & Run
                </Button>
              </Col>
            </Row>
            {/* <h2>
              <Badge
                bg="secondary"
                style={{ marginTop: "10px", }}
              >Details:
              </Badge>
            </h2>
            <textarea
              style={{ width: "100%", height: "23%", padding: "8px" }}
              disabled
              value={details}
            /> */}

          </Col>
          {/* {(testcaseResults && testcaseResults.length > 0) ? (testcaseResults.map((result, index) => {
            return(
              <p
                key={index}
              > Testcase {testcaseResults.length} is passed
              </p>
            )
          })) : ""} */}
        </Row>

        {/* <button
          type="button"
          className="btn btn-primary"
          data-bs-toggle="modal"
          data-bs-target="#staticBackdrop"
        >
  Launch static backdrop modal
        </button> */}

        <div
          className="modal fade"
          id="staticBackdrop"
          data-bs-backdrop="static"
          data-bs-keyboard="false"
          tabIndex="-1"
          aria-labelledby="staticBackdropLabel"
          aria-hidden="true"
        >
          <div
            style={{ width: "1500px" }}
            className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable game-modal"
          >
            <div className="modal-content">
              <div className="modal-header">
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                >
                </button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-9">
                    <Canvas2 gameArray = {findGameArray()}></Canvas2>
                  </div>
                  <div className="col-3">
                    <div>
                      {findGameStory().map(item => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-success"
                  data-bs-dismiss="modal"
                >Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}


// eslint-disable-next-line react/prop-types
const LanguagesDropdown = ({ onSelectChange }) => {
  return (
    <div style={{ width: "150px", paddingBottom: "13px" }}>
      <Select
        isSearchable={false}
        placeholder={"Select Language"}
        options={languageOptions}
        defaultValue={languageOptions[0]}
        onChange={(selectedOption) => onSelectChange(selectedOption)}
      />
    </div>
  );
};

const SubmissionRow = (sub) => {
  return (
    <>
      <tr key={sub._id}>
        <td>{`${sub.timeSubmitted.slice(0, 10)} ${sub.timeSubmitted.slice(11, 16)} `}</td>
        <td
          style={
            sub.status ?
              { color: "green" } :
              { color: "red" }
          }
        >{sub.status ? "Accepted" : "Failed"}
        </td>
        <td> {sub.testcases.reduce((r, x) => r + (x.status ? 1 : 0), 0)} / {sub.testcases.length}</td>
        {/* <td> ms</td> */}
        <td>{sub.language}</td>
      </tr>
    </>
  )
}

export default QuestionPage;