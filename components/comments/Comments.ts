import "./comments.scss";
import Mustache from "mustache";
import { stripTags, checkResponse } from "../../util";
import ErrorUI from "../ErrorUI/ErrorUI";
// @ts-ignore
import grecaptcha from "grecaptcha";

interface Comment {
  name: string;
  comment: string;
}

export default class Comments {
  commentsEl = document.getElementById("comments")!;
  commentCountEl = document.getElementById("comment-count")!;
  commentFormEl = document.getElementById("comment-form")!;
  commentTextarea = document.querySelector("#comment-form textarea")!;
  textareaCharCountEl = document.querySelector("#char-count span")!;
  commentFormThanksEl = document.getElementById("comment-form-thanks-message")!;
  template = document.getElementById("comment-template")!.innerHTML;
  captchaKey = "6LeYiwolAAAAAG9u-F-xmcJLRFUB_W0HkvOqC12U";

  constructor() {
    this.addCharCount();
    this.loadComments();
    this.commentFormEl.addEventListener("submit", this.onSubmit.bind(this));
  }

  addCharCount() {
    this.commentTextarea.addEventListener("keyup", (e: any) => {
      this.textareaCharCountEl.textContent = e.target.value.length;
    });
  }

  buttonLoading() {
    const submitButton = document.querySelector("#comment-form button")!;
    let dotStr = "";
    let dots = setInterval(() => {
      if (dotStr.length > 2) {
        dotStr = "";
      } else {
        dotStr += ".";
      }
      submitButton.innerHTML = `Loading<span class="dots">${dotStr}</span>`;
    }, 100);
  }

  onSubmit(e: any) {
    e.preventDefault();
    e.target.querySelector("button").disabled = true;
    this.buttonLoading();

    grecaptcha
      .execute(this.captchaKey, { action: "submit" })
      .then((token: string) => {
        const formData = new FormData(e.target);
        formData.append("captchaToken", token);

        this.submitComment(formData)
          .then((response) => {
            const commentHTML = this.commentHTML(
              response.name,
              response.comment,
              response.created
            );

            this.commentsEl.insertAdjacentHTML("afterbegin", commentHTML);
            this.commentCountEl.innerText = `${
              parseInt(this.commentCountEl.innerText) + 1
            }`;

            if (this.commentCountEl.innerText === "1") {
              document.getElementById("be-the-first")!.remove();
            }

            this.animateForm();
          })
          .catch((error) => {
            const errorUi = new ErrorUI(
              document.querySelector(".comments-modal")!
            );
            errorUi.start();
          });
      });
  }

  animateForm() {
    this.commentFormEl.addEventListener("animationend", (e) => {
      this.commentFormEl.style.visibility = "hidden";
      this.commentFormThanksEl.classList.add("display");
    });

    this.commentFormEl.classList.add("submitted");
  }

  async submitComment(data: FormData) {
    let formDataObject: Comment = { name: "", comment: "" };
    data.forEach((v, k) => {
      formDataObject[k as keyof Comment] = stripTags(v as string);
    });

    const response = await fetch(`${process.env.API_BASE_URL}/comments/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formDataObject),
    });
    return checkResponse(response);
  }

  loadComments() {
    fetch(`${process.env.API_BASE_URL}/comments/`)
      .then((response) => checkResponse(response))
      .then((data) => {
        this.commentsEl.innerText = "";
        this.commentCountEl.innerText = data.length;

        let commentsHTML = "";
        data.forEach((comment: any) => {
          commentsHTML += this.commentHTML(
            comment.name,
            comment.comment,
            comment.created
          );
        });

        if (data.length === 0) {
          this.commentsEl.innerHTML =
            "<div id='be-the-first'><p>(ඟ⍘ඟ)</p><p>404 Not Found</p></div>";
        } else {
          this.commentsEl.innerHTML = commentsHTML;
        }
      })
      .catch((error) => {
        const errorUi = new ErrorUI(document.querySelector(".comments-modal")!);
        errorUi.start();
      });
  }

  commentHTML(name: string, comment: string, created: string) {
    return Mustache.render(this.template, {
      name: name,
      comment: comment,
      created: created,
    });
  }
}
