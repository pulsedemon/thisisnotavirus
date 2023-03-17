import "./comments.scss";
import Mustache from "mustache";
import { stripTags, checkResponse } from "../../util";

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
    // TODO: add loading animation
    // TODO: only show comment form once per day
    this.addCharCount();
    this.loadComments();
    this.commentFormEl.addEventListener("submit", this.onSubmit.bind(this));
  }

  addCharCount() {
    this.commentTextarea.addEventListener("keyup", (e: any) => {
      this.textareaCharCountEl.textContent = e.target.value.length;
    });
  }

  onSubmit(e: any) {
    e.preventDefault();
    e.target.querySelector("button").disabled = true;

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
            console.log(error);
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

    const response = await fetch("http://localhost:8080/comments/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formDataObject),
    });
    return checkResponse(response);
  }

  loadComments() {
    fetch("http://localhost:8080/comments/")
      .then((response) => response.json())
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
            "<div id='be-the-first'><p>(ඟ⍘ඟ)</p><p>It's lonely here</p></div>";
        } else {
          this.commentsEl.innerHTML = commentsHTML;
        }
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
